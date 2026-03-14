import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import * as bcrypt from 'bcryptjs';
import { AuditAction } from '@prisma/client';

const failedAttempts = new Map<string, { count: number; lastAt: Date }>();
const MAX_FAILED = 5;
const LOCKOUT_MINUTES = 15;

function resolveExpiryDate(exp: string | number | undefined, fallbackDays: number) {
  const now = Date.now();
  if (typeof exp === 'number' && Number.isFinite(exp)) return new Date(now + exp * 1000);
  if (typeof exp === 'string') {
    const raw = exp.trim();
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return new Date(now + numeric * 1000);
    const match = raw.match(/^(\d+)\s*([smhd])$/i);
    if (match) {
      const v = Number(match[1]);
      const mul: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      return new Date(now + v * (mul[match[2].toLowerCase()] || 86400000));
    }
  }
  return new Date(now + fallbackDays * 86400000);
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async login(email: string, password: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Kredensial tidak valid');

    const attempts = failedAttempts.get(user.id);
    if (attempts && attempts.count >= MAX_FAILED) {
      const lockEnd = new Date(attempts.lastAt.getTime() + LOCKOUT_MINUTES * 60000);
      if (new Date() < lockEnd) {
        throw new ForbiddenException(`Akun terkunci. Coba lagi pukul ${lockEnd.toLocaleTimeString('id-ID')}`);
      }
      failedAttempts.delete(user.id);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const cur = failedAttempts.get(user.id) || { count: 0, lastAt: new Date() };
      failedAttempts.set(user.id, { count: cur.count + 1, lastAt: new Date() });
      await this.audit.log({ userId: user.id, action: AuditAction.FAILED_AUTH, entity: 'User', entityId: user.id, metadata: { email, ipAddress } });
      throw new UnauthorizedException('Kredensial tidak valid');
    }

    failedAttempts.delete(user.id);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.audit.log({ userId: user.id, action: AuditAction.LOGIN, entity: 'User', entityId: user.id, metadata: { ipAddress } });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        phoneNumber: user.phoneNumber,
        memberNumber: user.memberNumber,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      this.jwtService.verify(refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
      const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } });
      if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) throw new UnauthorizedException();
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      return this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    await this.audit.log({ userId, action: AuditAction.LOGOUT, entity: 'User', entityId: userId });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, profileImageUrl: true, phoneNumber: true, memberNumber: true },
    });
  }


  async reAuth(userId: string, credential: string, type: 'password' | 'pin' = 'pin') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User tidak ditemukan');

    let valid = false;
    if (type === 'pin' && user.pin) {
      valid = await bcrypt.compare(credential, user.pin);
    } else {
      valid = await bcrypt.compare(credential, user.passwordHash);
    }

    if (!valid) {
      await this.audit.log({
        userId,
        action: AuditAction.FAILED_AUTH,
        entity: 'ReAuth',
        metadata: { type, reason: 'reauth_failed' },
      });
      throw new UnauthorizedException('PIN/password tidak valid');
    }

    const token = this.jwtService.sign(
      { sub: userId, reAuth: true },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '5m' },
    );
    return { reAuthToken: token, expiresIn: 300 };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '8h',
    });
    const refreshExp = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: refreshExp,
    });
    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt: resolveExpiryDate(refreshExp, 30) },
    });
    return { accessToken, refreshToken };
  }
}
