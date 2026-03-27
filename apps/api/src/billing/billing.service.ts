// billing.service.ts — v2
// Perubahan dari v1:
//   - Hapus semua dependency IotService & IoT command
//   - Hapus assertTableReadyForBilling
//   - Hapus re-auth OWNER (disederhanakan, bisa dikembalikan jika perlu)
//   - Tambah guestName / memberId saat buat sesi

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction, Role, SessionStatus, TableStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateBillingDto {
  tableId: string;
  durationMinutes: number;
  rateType?: 'HOURLY' | 'FLEXIBLE' | 'PACKAGE';
  billingPackageId?: string;
  // Identitas tamu
  guestName?: string;    // jika tamu non-member
  memberId?: string;     // jika member
}

interface ExtendBillingDto {
  additionalMinutes: number;
  billingPackageId?: string;
}

interface MoveBillingDto {
  targetTableId: string;
}

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private getElapsedMinutes(startTime: Date, endTime: Date = new Date()) {
    return Math.max(1, Math.ceil((endTime.getTime() - startTime.getTime()) / 60000));
  }

  private calculateFlexibleAmount(ratePerHour: Decimal, minutes: number) {
    if (minutes <= 60) return ratePerHour.toDecimalPlaces(0);
    const prorated = ratePerHour.mul(minutes).div(60);
    return prorated.div(5000).ceil().mul(5000).toDecimalPlaces(0);
  }

  private assertPackageRateMatchesTable(pkg: { targetHourlyRate: any; name: string }, tableRate: Decimal) {
    const packageRate = new Decimal(pkg.targetHourlyRate.toString()).toDecimalPlaces(2);
    if (!packageRate.equals(tableRate.toDecimalPlaces(2))) {
      throw new BadRequestException(
        `Paket ${pkg.name} hanya berlaku untuk meja dengan tarif ${packageRate.toFixed(0)} per jam`,
      );
    }
  }

  // ─── Buat sesi ─────────────────────────────────────────────────────────────

  async createSession(dto: CreateBillingDto, userId: string, userRole: Role) {
    // Validasi: harus ada identitas tamu atau member
    if (!dto.guestName && !dto.memberId) {
      throw new BadRequestException('Isi nama tamu atau pilih member');
    }

    const isOwnerLock = userRole === Role.OWNER;

    // Validasi meja
    const table = await this.prisma.table.findUnique({
      where: { id: dto.tableId },
      include: { billingSessions: { where: { status: SessionStatus.ACTIVE } } },
    });

    if (!table) throw new NotFoundException('Meja tidak ditemukan');
    if (!table.isActive) throw new BadRequestException('Meja tidak aktif');
    if (table.status !== TableStatus.AVAILABLE) {
      throw new BadRequestException('Meja sedang tidak tersedia');
    }
    if (table.billingSessions.length > 0) {
      throw new BadRequestException('Meja sudah memiliki sesi aktif');
    }

    if (!isOwnerLock && dto.durationMinutes < 60) {
      throw new BadRequestException('Durasi billing minimal 60 menit');
    }
    if (!isOwnerLock && dto.durationMinutes % 60 !== 0) {
      throw new BadRequestException('Durasi harus kelipatan 60 menit');
    }

    const selectedRateType = dto.rateType || 'HOURLY';
    const isFlexible = !isOwnerLock && selectedRateType === 'FLEXIBLE';
    const usePackage = !isOwnerLock && (selectedRateType === 'PACKAGE' || !!dto.billingPackageId);
    if (!isOwnerLock && selectedRateType === 'PACKAGE' && !dto.billingPackageId) {
      throw new BadRequestException('Pilih paket billing terlebih dahulu');
    }
    const ratePerHour = isOwnerLock
      ? new Decimal(0)
      : new Decimal(table.hourlyRate.toString());

    let packageName: string | undefined;
    let packageOriginalPrice: Decimal | undefined;
    let packagePrice: Decimal | undefined;

    if (usePackage && dto.billingPackageId) {
      const pkg = await this.prisma.billingPackage.findUnique({
        where: { id: dto.billingPackageId },
        include: { items: true },
      });
      if (!pkg || !pkg.isActive) throw new BadRequestException('Paket tidak ditemukan');
      this.assertPackageRateMatchesTable(pkg, new Decimal(table.hourlyRate.toString()));
      if (!pkg.durationMinutes) throw new BadRequestException('Paket harus memiliki durasi');
      dto.durationMinutes = pkg.durationMinutes;
      packageName = pkg.name;
      packagePrice = new Decimal(pkg.price.toString());
      const billingOri = new Decimal(table.hourlyRate.toString()).mul(pkg.durationMinutes).div(60);
      const fnbOri = pkg.items
        .filter((i) => i.type === 'MENU_ITEM')
        .reduce((s, i) => s.plus(new Decimal(i.unitPrice.toString()).mul(i.quantity)), new Decimal(0));
      packageOriginalPrice = billingOri.plus(fnbOri);
    }

    const startTime = new Date();
    const effectiveDuration = isOwnerLock || isFlexible ? 525600 : dto.durationMinutes;
    const endTime = new Date(startTime.getTime() + effectiveDuration * 60 * 1000);
    const totalAmount =
      usePackage
        ? packagePrice ?? new Decimal(0)
        : isOwnerLock
        ? new Decimal(0)
        : isFlexible
        ? new Decimal(0)
        : ratePerHour.mul(effectiveDuration).div(60).toDecimalPlaces(0);

    const appliedRateType =
      usePackage
        ? 'PACKAGE'
        : isOwnerLock
        ? 'OWNER_LOCK'
        : selectedRateType;

    const session = await this.prisma.billingSession.create({
      data: {
        tableId: dto.tableId,
        guestName: dto.guestName,
        memberId: dto.memberId,
        startTime,
        endTime,
        durationMinutes: effectiveDuration,
        rateType: appliedRateType,
        ratePerHour: ratePerHour.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        packageName,
        packageOriginalPrice: packageOriginalPrice?.toFixed(2),
        createdById: userId,
        approvedById: userRole === Role.OWNER ? userId : undefined,
      },
      include: {
        table: true,
        member: { select: { id: true, name: true, memberNumber: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    await this.prisma.table.update({
      where: { id: dto.tableId },
      data: { status: TableStatus.OCCUPIED },
    });

    if (usePackage && dto.billingPackageId) {
      await this.applyPackage(session.id, dto.billingPackageId, userId, session.tableId, dto.durationMinutes);
    }

    await this.audit.log({
      userId,
      action: AuditAction.START_BILLING,
      entity: 'BillingSession',
      entityId: session.id,
      afterData: { tableId: dto.tableId, durationMinutes: effectiveDuration, totalAmount },
    });

    return session;
  }

  // ─── Extend sesi ───────────────────────────────────────────────────────────

  async extendSession(sessionId: string, dto: ExtendBillingDto, userId: string) {
    const session = await this.prisma.billingSession.findUnique({
      where: { id: sessionId },
      include: { table: true },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');
    if (session.status !== SessionStatus.ACTIVE) throw new BadRequestException('Sesi tidak aktif');
    if (session.rateType === 'OWNER_LOCK') throw new ForbiddenException('Sesi owner lock tidak bisa diperpanjang');
    if (session.rateType === 'FLEXIBLE') throw new ForbiddenException('Sesi main bebas tidak bisa diperpanjang');

    if (!dto.billingPackageId && (dto.additionalMinutes < 60 || dto.additionalMinutes % 60 !== 0)) {
      throw new BadRequestException('Perpanjangan minimal 60 menit dan kelipatan 60');
    }

    let extensionPackagePrice: Decimal | null = null;
    if (dto.billingPackageId) {
      const pkg = await this.prisma.billingPackage.findUnique({ where: { id: dto.billingPackageId } });
      if (!pkg || !pkg.isActive) throw new BadRequestException('Paket tidak ditemukan');
      this.assertPackageRateMatchesTable(pkg, new Decimal(session.table.hourlyRate.toString()));
      if (!pkg.durationMinutes) throw new BadRequestException('Paket perpanjang harus memiliki durasi');
      dto.additionalMinutes = pkg.durationMinutes;
      extensionPackagePrice = new Decimal(pkg.price.toString());
    }

    const additionalMs = dto.additionalMinutes * 60 * 1000;
    const newEndTime = new Date(session.endTime.getTime() + additionalMs);
    const additionalAmount = extensionPackagePrice || new Decimal(session.ratePerHour.toString())
      .mul(dto.additionalMinutes)
      .div(60)
      .toDecimalPlaces(0);
    const newTotal = new Decimal(session.totalAmount.toString()).plus(additionalAmount);
    const newDuration = session.durationMinutes + dto.additionalMinutes;

    const updated = await this.prisma.billingSession.update({
      where: { id: sessionId },
      data: { endTime: newEndTime, durationMinutes: newDuration, totalAmount: newTotal.toFixed(2) },
      include: { table: true },
    });

    await this.audit.log({
      userId,
      action: AuditAction.EXTEND_BILLING,
      entity: 'BillingSession',
      entityId: sessionId,
      beforeData: { endTime: session.endTime, totalAmount: session.totalAmount },
      afterData: { endTime: newEndTime, totalAmount: newTotal, additionalMinutes: dto.additionalMinutes, additionalAmount },
    });

    if (dto.billingPackageId) {
      await this.applyPackage(sessionId, dto.billingPackageId, userId, session.tableId, dto.additionalMinutes);
    }

    return updated;
  }

  // ─── Stop sesi ─────────────────────────────────────────────────────────────

  async stopSession(sessionId: string, userId: string) {
    const session = await this.prisma.billingSession.findUnique({
      where: { id: sessionId },
      include: { table: true },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');
    if (session.status !== SessionStatus.ACTIVE) throw new BadRequestException('Sesi tidak aktif');

    const now = new Date();
    const actualMinutes = this.getElapsedMinutes(session.startTime, now);
    const finalAmount =
      session.rateType === 'OWNER_LOCK'
        ? new Decimal(0)
        : session.rateType === 'FLEXIBLE'
        ? this.calculateFlexibleAmount(new Decimal(session.ratePerHour.toString()), actualMinutes)
        : new Decimal(session.totalAmount.toString());

    const updated = await this.prisma.billingSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        actualEndTime: now,
        durationMinutes: actualMinutes,
        totalAmount: finalAmount.toFixed(2),
      },
    });

    await this.prisma.table.update({
      where: { id: session.tableId },
      data: { status: TableStatus.AVAILABLE },
    });

    await this.audit.log({
      userId,
      action: AuditAction.STOP_BILLING,
      entity: 'BillingSession',
      entityId: sessionId,
      afterData: { actualMinutes, finalAmount, stoppedEarly: now < session.endTime },
    });

    return updated;
  }

  // ─── Pindah meja ───────────────────────────────────────────────────────────

  async moveSession(sessionId: string, dto: MoveBillingDto, userId: string, userRole: Role) {
    const session = await this.prisma.billingSession.findUnique({
      where: { id: sessionId },
      include: { table: true },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');
    if (session.status !== SessionStatus.ACTIVE) throw new BadRequestException('Sesi tidak aktif');
    if (session.tableId === dto.targetTableId) throw new BadRequestException('Meja tujuan sama');

    const target = await this.prisma.table.findUnique({
      where: { id: dto.targetTableId },
      include: { billingSessions: { where: { status: SessionStatus.ACTIVE } } },
    });
    if (!target) throw new NotFoundException('Meja tujuan tidak ditemukan');
    if (!target.isActive) throw new BadRequestException('Meja tujuan tidak aktif');
    if (target.status !== TableStatus.AVAILABLE) throw new BadRequestException('Meja tujuan tidak tersedia');
    if (target.billingSessions.length > 0) throw new BadRequestException('Meja tujuan sedang digunakan');

    if (session.rateType !== 'OWNER_LOCK' && userRole !== Role.OWNER) {
      const srcRate = new Decimal(session.table.hourlyRate.toString());
      const tgtRate = new Decimal(target.hourlyRate.toString());
      if (!srcRate.equals(tgtRate)) {
        throw new BadRequestException('Pindah meja hanya bisa ke meja dengan tarif yang sama');
      }
    }

    await this.prisma.$transaction([
      this.prisma.billingSession.update({ where: { id: sessionId }, data: { tableId: target.id } }),
      this.prisma.table.update({ where: { id: session.tableId }, data: { status: TableStatus.AVAILABLE } }),
      this.prisma.table.update({ where: { id: target.id }, data: { status: TableStatus.OCCUPIED } }),
    ]);

    await this.audit.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'BillingSession',
      entityId: sessionId,
      beforeData: { tableId: session.tableId, tableName: session.table.name },
      afterData: { tableId: target.id, tableName: target.name },
    });

    return this.getSession(sessionId);
  }

  // ─── Query ─────────────────────────────────────────────────────────────────

  async getActiveSessions() {
    const sessions = await this.prisma.billingSession.findMany({
      where: { status: SessionStatus.ACTIVE },
      include: {
        table: true,
        member: { select: { id: true, name: true, memberNumber: true } },
        createdBy: { select: { id: true, name: true } },
        orders: { where: { status: { not: 'CANCELLED' } }, include: { items: true } },
        payments: { where: { status: 'PAID' } },
        packageUsages: { include: { billingPackage: { include: { items: { include: { menuItem: true } } } } } },
      },
      orderBy: { startTime: 'asc' },
    });

    return sessions.map((session) => {
      if (session.rateType !== 'FLEXIBLE') return session;
      const elapsedMinutes = this.getElapsedMinutes(session.startTime);
      const temporaryAmount = this.calculateFlexibleAmount(new Decimal(session.ratePerHour.toString()), elapsedMinutes);
      return { ...session, elapsedMinutes, temporaryAmount: temporaryAmount.toFixed(2) };
    });
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.billingSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        member: { select: { id: true, name: true, memberNumber: true, phoneNumber: true } },
        createdBy: { select: { id: true, name: true } },
        orders: { where: { status: { not: 'CANCELLED' } }, include: { items: { include: { menuItem: true } } } },
        payments: true,
        packageUsages: { include: { billingPackage: { include: { items: { include: { menuItem: true } } } } } },
      },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');

    const extensionLogs = await this.prisma.auditLog.findMany({
      where: { entity: 'BillingSession', entityId: sessionId, action: AuditAction.EXTEND_BILLING },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true, afterData: true },
    });

    const extensionItems = extensionLogs.map((log: any, i: number) => {
      const d = (log.afterData || {}) as any;
      return { id: log.id, order: i + 1, createdAt: log.createdAt, additionalMinutes: Number(d.additionalMinutes || 0), additionalAmount: Number(d.additionalAmount || 0) };
    });

    const extensionTotal = extensionItems.reduce((s, x) => s + x.additionalAmount, 0);
    const isFlexible = session.rateType === 'FLEXIBLE';
    const elapsedMinutes = this.getElapsedMinutes(session.startTime, session.actualEndTime || new Date());
    const sessionTotal = isFlexible
      ? Number(this.calculateFlexibleAmount(new Decimal(session.ratePerHour.toString()), elapsedMinutes).toFixed(2))
      : Number(session.totalAmount || 0);
    const baseAmount = Math.max(0, sessionTotal - extensionTotal);

    return {
      ...session,
      elapsedMinutes,
      temporaryAmount: isFlexible ? sessionTotal : undefined,
      billingBreakdown: { baseAmount, extensionTotal, extensions: extensionItems },
    };
  }

  async listSessions(filters: {
    status?: SessionStatus;
    tableId?: string;
    startDate?: Date;
    endDate?: Date;
    memberId?: string;
    page?: number;
    limit?: number;
    unpaidOnly?: boolean;
  }) {
    const where: any = {};
    if (filters.unpaidOnly) {
      if (filters.status) {
        where.status = filters.status;
      } else {
        where.status = { in: [SessionStatus.ACTIVE, SessionStatus.COMPLETED] };
      }
      where.payments = { none: { status: 'PAID' } };
    } else if (filters.status) {
      where.status = filters.status;
    }
    if (filters.tableId) where.tableId = filters.tableId;
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) where.startTime.gte = filters.startDate;
      if (filters.endDate) where.startTime.lte = filters.endDate;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.billingSession.findMany({
        where,
        include: {
          table: true,
          member: { select: { id: true, name: true, memberNumber: true } },
          createdBy: { select: { id: true, name: true } },
          payments: { where: { status: 'PAID' } },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.billingSession.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async removeUnpaidSession(sessionId: string, userId: string) {
    const session = await this.prisma.billingSession.findUnique({
      where: { id: sessionId },
      include: { payments: { where: { status: 'PAID' } }, orders: { where: { status: { not: 'CANCELLED' } } } },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');
    if (session.status !== SessionStatus.ACTIVE && session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException('Hanya sesi aktif atau selesai (belum dibayar) yang bisa dihapus');
    }
    if (session.payments.length > 0) throw new BadRequestException('Sesi sudah dibayar, tidak bisa dihapus');

    await this.prisma.$transaction(async (tx) => {
      if (session.orders.length > 0) {
        await tx.orderItemModifier.deleteMany({ where: { orderItem: { order: { billingSessionId: session.id } } } });
        await tx.orderItem.deleteMany({ where: { order: { billingSessionId: session.id } } });
        await tx.order.deleteMany({ where: { billingSessionId: session.id } });
      }
      await tx.sessionPackageUsage.deleteMany({ where: { billingSessionId: session.id } });
      await tx.billingSession.delete({ where: { id: session.id } });
      if (session.status === SessionStatus.ACTIVE) {
        await tx.table.update({
          where: { id: session.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }
    });

    await this.audit.log({ userId, action: AuditAction.DELETE, entity: 'BillingSession', entityId: sessionId });
    return { success: true };
  }

  // ─── Apply package (private) ───────────────────────────────────────────────

  private async applyPackage(sessionId: string, packageId: string, userId: string, tableId: string, durationMinutes?: number) {
    const pkg = await this.prisma.billingPackage.findUnique({
      where: { id: packageId },
      include: { items: { include: { menuItem: { include: { stock: true } } } } },
    });
    if (!pkg) return;

    const session = await this.prisma.billingSession.findUnique({ where: { id: sessionId }, select: { ratePerHour: true } });
    const billingOri = session && durationMinutes
      ? new Decimal(session.ratePerHour.toString()).mul(durationMinutes).div(60).toDecimalPlaces(2)
      : new Decimal(0);

    const packageOri = pkg.items.reduce(
      (sum, item) => sum.plus(new Decimal(item.unitPrice.toString()).mul(item.quantity)),
      billingOri,
    );

    await this.prisma.sessionPackageUsage.create({
      data: { billingSessionId: sessionId, billingPackageId: pkg.id, packageName: pkg.name, packagePrice: pkg.price.toFixed(2), originalPrice: packageOri.toFixed(2), durationMinutes: pkg.durationMinutes },
    });

    const menuItems = pkg.items.filter((i) => i.type === 'MENU_ITEM' && i.menuItemId);
    if (menuItems.length === 0) return;

    await this.prisma.order.create({
      data: {
        orderNumber: `PKG-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        billingSessionId: sessionId,
        tableId,
        status: 'CONFIRMED',
        notes: `AUTO_PACKAGE:${pkg.name}`,
        subtotal: '0.00',
        taxAmount: '0.00',
        total: '0.00',
        createdById: userId,
        items: {
          create: menuItems.map((item) => ({
            menuItemId: item.menuItemId!,
            quantity: item.quantity,
            unitPrice: '0.00',
            subtotal: '0.00',
            taxAmount: '0.00',
            notes: `Included in package ${pkg.name}`,
          })),
        },
      },
    });

    for (const item of menuItems) {
      if (!item.menuItem?.stock?.trackStock) continue;
      await this.prisma.stockFnb.update({ where: { menuItemId: item.menuItemId! }, data: { qtyOnHand: { decrement: item.quantity } } });
      await this.prisma.stockAdjustment.create({
        data: { stockFnbId: item.menuItem.stock.id, actionType: 'SALE_DEDUCTION', quantityDelta: -item.quantity, notes: `Paket ${pkg.name}`, performedById: userId },
      });
    }
  }

  // ─── Cron auto-expire ──────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkBillingSessions() {
    const now = new Date();
    const expiredSessions = await this.prisma.billingSession.findMany({
      where: { status: SessionStatus.ACTIVE, rateType: { notIn: ['OWNER_LOCK', 'FLEXIBLE'] }, endTime: { lte: now } },
    });

    for (const session of expiredSessions) {
      try {
        await this.prisma.billingSession.update({ where: { id: session.id }, data: { status: SessionStatus.COMPLETED, actualEndTime: now } });
        await this.prisma.table.update({ where: { id: session.tableId }, data: { status: TableStatus.AVAILABLE } });
        await this.audit.log({ action: AuditAction.AUTO_STOP_BILLING, entity: 'BillingSession', entityId: session.id, afterData: { reason: 'session_timeout', autoStoppedAt: now } });
        console.log(`⏰ Sesi ${session.id} auto-selesai`);
      } catch (err) {
        console.error(`Gagal auto-selesai sesi ${session.id}:`, err);
      }
    }
  }
}
