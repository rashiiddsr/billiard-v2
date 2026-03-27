import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class MembersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── Generate nomor member ────────────────────────────────────────────────

  private async generateMemberNumber(): Promise<string> {
    const last = await this.prisma.user.findFirst({
      where: { role: Role.MEMBER, memberNumber: { not: null } },
      orderBy: { memberNumber: 'desc' },
      select: { memberNumber: true },
    });

    let nextNum = 1;
    if (last?.memberNumber) {
      const match = /M-(\d+)/.exec(last.memberNumber);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    return `M-${String(nextNum).padStart(4, '0')}`;
  }

  // ─── Generate password random 8 karakter ─────────────────────────────────

  private generateRawPassword(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
  }

  private async ensureUniquePhoneNumber(phoneNumber: string, excludeUserId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        role: Role.MEMBER,
        phoneNumber,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Nomor HP member sudah digunakan');
    }
  }

  // ─── Buat member baru ─────────────────────────────────────────────────────

  async createMember(
    dto: { name: string; phoneNumber: string },
    actorId: string,
  ) {
    const normalizedPhone = dto.phoneNumber.trim();
    await this.ensureUniquePhoneNumber(normalizedPhone);

    const memberNumber = await this.generateMemberNumber();
    const email = `member-${memberNumber.toLowerCase().replace('-', '')}@internal.vluxe.local`;

    // Cek email duplicate
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Member number conflict, coba lagi');

    const rawPassword = this.generateRawPassword();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const member = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        phoneNumber: normalizedPhone,
        passwordHash,
        role: Role.MEMBER,
        memberNumber,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        memberNumber: true,
        role: true,
        isActive: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.CREATE,
      entity: 'Member',
      entityId: member.id,
      afterData: { name: dto.name, memberNumber },
    });

    // Kembalikan password sekali saja
    return { member, credentials: { email, password: rawPassword } };
  }

  // ─── List semua member ────────────────────────────────────────────────────

  async listMembers(params: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, isActive, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { role: Role.MEMBER };
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phoneNumber: { contains: search } },
        { memberNumber: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          memberNumber: true,
          email: true,
          profileImageUrl: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { memberSessions: true },
          },
        },
        orderBy: { memberNumber: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Detail member ────────────────────────────────────────────────────────

  async getMember(id: string, requesterId: string, requesterRole: Role) {
    // Member hanya bisa lihat diri sendiri
    if (requesterRole === Role.MEMBER && id !== requesterId) {
      throw new ForbiddenException('Akses ditolak');
    }

    const member = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        memberNumber: true,
        email: true,
        profileImageUrl: true,
        isActive: true,
        createdAt: true,
        memberSessions: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            table: { select: { id: true, name: true } },
            payments: { where: { status: 'PAID' }, select: { totalAmount: true, paidAt: true } },
          },
        },
      },
    });

    if (!member) throw new NotFoundException('Member tidak ditemukan');
    if (member.email.includes('@internal') && requesterRole !== Role.OWNER && requesterRole !== Role.MANAGER) {
      // Sembunyikan email internal dari cashier & member itu sendiri
    }

    return member;
  }

  // ─── Update member ────────────────────────────────────────────────────────

  async updateMember(
    id: string,
    dto: { name?: string; phoneNumber?: string; isActive?: boolean },
    actorId: string,
  ) {
    const member = await this.prisma.user.findUnique({ where: { id } });
    if (!member || member.role !== Role.MEMBER) throw new NotFoundException('Member tidak ditemukan');

    if (dto.phoneNumber && dto.phoneNumber.trim() !== member.phoneNumber) {
      await this.ensureUniquePhoneNumber(dto.phoneNumber.trim(), id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...dto, ...(dto.phoneNumber ? { phoneNumber: dto.phoneNumber.trim() } : {}) },
      select: {
        id: true, name: true, phoneNumber: true,
        memberNumber: true, isActive: true, updatedAt: true,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.UPDATE,
      entity: 'Member',
      entityId: id,
      beforeData: { name: member.name, phoneNumber: member.phoneNumber, isActive: member.isActive },
      afterData: dto,
    });

    return updated;
  }


  async resetCredentials(memberId: string, actorId: string, customEmail?: string) {
    const member = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.role !== Role.MEMBER) {
      throw new NotFoundException('Member tidak ditemukan');
    }

    const normalizedEmail = customEmail?.trim().toLowerCase();
    if (normalizedEmail && !normalizedEmail.includes('@')) {
      throw new ConflictException('Format email tidak valid');
    }
    const nextEmail = normalizedEmail || member.email;
    if (nextEmail !== member.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: nextEmail } });
      if (exists && exists.id !== memberId) {
        throw new ConflictException('Email sudah digunakan user lain');
      }
    }

    const rawPassword = this.generateRawPassword();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const updated = await this.prisma.user.update({
      where: { id: memberId },
      data: {
        email: nextEmail,
        passwordHash,
      },
      select: { id: true, name: true, email: true, memberNumber: true },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.UPDATE,
      entity: 'MemberCredentials',
      entityId: memberId,
      afterData: { email: updated.email },
    });

    return {
      member: updated,
      credentials: { email: updated.email, password: rawPassword },
    };
  }

  // ─── Profil member (self) ─────────────────────────────────────────────────

  async getMyProfile(memberId: string) {
    return this.getMember(memberId, memberId, Role.MEMBER);
  }

  // ─── Search member untuk kasir (saat mulai billing) ──────────────────────

  async searchForBilling(query: string) {
    return this.prisma.user.findMany({
      where: {
        role: Role.MEMBER,
        isActive: true,
        OR: [
          { name: { contains: query } },
          { phoneNumber: { contains: query } },
          { memberNumber: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        memberNumber: true,
        profileImageUrl: true,
      },
      take: 10,
    });
  }
}
