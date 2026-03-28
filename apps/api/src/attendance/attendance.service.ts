import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction, AttendanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { createHash } from 'crypto';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private getQrTimeSlot(date = new Date()): number {
    return Math.floor(date.getTime() / (5 * 60 * 1000));
  }

  private generateQrCode(slot = this.getQrTimeSlot()): string {
    const secret = process.env.ATTENDANCE_QR_SECRET || 'attendance-secret';
    return createHash('sha256').update(`${secret}:${slot}`).digest('hex').slice(0, 24);
  }

  private isQrCodeValid(code: string): boolean {
    const currentSlot = this.getQrTimeSlot();
    const accepted = [currentSlot, currentSlot - 1, currentSlot + 1].map((slot) => this.generateQrCode(slot));
    return accepted.includes(code);
  }

  private resolveAttendanceWindowShift(shifts: any[], now = new Date()) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const activeNow = shifts.filter((shift) => {
      const startMinutes = timeToMinutes(shift.startTime);
      const earlyBound = startMinutes - shift.earlyWindowMinutes;
      const lateBound = timeToMinutes(shift.endTime);
      return nowMinutes >= earlyBound && nowMinutes <= lateBound;
    });
    if (activeNow.length === 0) throw new BadRequestException('Saat ini tidak ada shift yang sedang dibuka untuk absen');
    if (activeNow.length > 1) throw new BadRequestException('Terdapat lebih dari 1 shift aktif, hubungi owner untuk penyesuaian jadwal');
    return activeNow[0];
  }

  async getDisplayPayload() {
    const [setting, shifts] = await Promise.all([this.getSetting(), this.listShifts(false)]);
    const slot = this.getQrTimeSlot();
    return {
      qrCode: this.generateQrCode(slot),
      refreshEverySeconds: 300,
      expiresAt: new Date((slot + 1) * 5 * 60 * 1000).toISOString(),
      setting,
      shifts,
    };
  }

  async checkIn(userId: string, role: string, dto: { qrCode: string; lat?: number; lng?: number }) {
    if (!this.isQrCodeValid(dto.qrCode)) {
      throw new BadRequestException('QR code tidak valid atau sudah kedaluwarsa');
    }

    const [setting, shifts] = await Promise.all([
      this.prisma.attendanceSetting.findUnique({ where: { id: 'default' } }),
      this.listShifts(false),
    ]);

    if (!setting) throw new BadRequestException('Setting lokasi absensi belum dikonfigurasi.');
    const shift = this.resolveAttendanceWindowShift(shifts);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeave = await this.prisma.attendanceLeaveRequest.findFirst({
      where: { userId, date: todayStart, status: 'APPROVED' as any },
    });
    if (approvedLeave) {
      throw new ConflictException('Anda sudah tercatat izin disetujui hari ini. Hapus data izin terlebih dahulu jika ingin absen.');
    }

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { userId, shiftId: shift.id, checkInAt: { gte: todayStart, lte: todayEnd } },
    });
    if (existing) throw new ConflictException('Anda sudah absen untuk shift ini hari ini');

    let distanceMeters: number | null = null;
    let geoStatus: AttendanceStatus = AttendanceStatus.ON_TIME;
    if (dto.lat !== undefined && dto.lng !== undefined) {
      distanceMeters = Math.round(
        haversineMeters(dto.lat, dto.lng, Number(setting.locationLat), Number(setting.locationLng)),
      );
      if (distanceMeters > setting.radiusMeters) geoStatus = AttendanceStatus.REJECTED;
    }

    let finalStatus: AttendanceStatus = geoStatus;
    if (geoStatus !== AttendanceStatus.REJECTED) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const shiftStartMinutes = timeToMinutes(shift.startTime);
      const earlyBound = shiftStartMinutes - shift.earlyWindowMinutes;
      const lateBound = shiftStartMinutes + shift.lateToleranceMinutes;
      if (nowMinutes < earlyBound) finalStatus = AttendanceStatus.EARLY;
      else if (nowMinutes <= lateBound) finalStatus = AttendanceStatus.ON_TIME;
      else finalStatus = AttendanceStatus.LATE;
    }

    const record = await this.prisma.attendanceRecord.create({
      data: {
        userId,
        shiftId: shift.id,
        checkInAt: new Date(),
        checkInLat: dto.lat !== undefined ? new Decimal(dto.lat) : null,
        checkInLng: dto.lng !== undefined ? new Decimal(dto.lng) : null,
        distanceMeters,
        status: finalStatus,
        notes:
          finalStatus === AttendanceStatus.REJECTED
            ? `Di luar radius (${distanceMeters}m dari ${setting.radiusMeters}m)`
            : finalStatus === AttendanceStatus.LATE
            ? `Terlambat (shift mulai ${shift.startTime})`
            : finalStatus === AttendanceStatus.EARLY
            ? `Terlalu awal (sebelum window ${shift.earlyWindowMinutes} menit)`
            : null,
      },
      include: {
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        user: { select: { id: true, name: true } },
      },
    });

    await this.audit.log({
      userId,
      action: AuditAction.CHECK_IN,
      entity: 'AttendanceRecord',
      entityId: record.id,
      afterData: { role, shiftId: shift.id, status: finalStatus, distanceMeters, lat: dto.lat, lng: dto.lng },
    });

    return {
      record,
      distanceMeters,
      radiusMeters: setting.radiusMeters,
      message: this.getStatusMessage(finalStatus, distanceMeters, shift.startTime),
    };
  }

  private getStatusMessage(status: AttendanceStatus, distance: number | null, shiftStart: string): string {
    const s = status as string;
    if (s === 'ON_TIME') return '✅ Absensi berhasil! Tepat waktu.';
    if (s === 'LATE') return `⚠️ Absensi tercatat, tetapi Anda terlambat (shift mulai ${shiftStart}).`;
    if (s === 'EARLY') return '⏰ Absensi tercatat, tetapi Anda terlalu awal sebelum window absen dimulai.';
    return `❌ Absensi ditolak. Anda berada ${distance}m dari lokasi kerja.`;
  }

  async getMyRecords(userId: string, params: { startDate?: Date; endDate?: Date; page?: number; limit?: number }) {
    const { startDate, endDate, page = 1, limit = 30 } = params;
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (startDate || endDate) {
      where.checkInAt = {};
      if (startDate) where.checkInAt.gte = startDate;
      if (endDate) where.checkInAt.lte = endDate;
    }
    const [data, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        include: { shift: { select: { id: true, name: true, startTime: true, endTime: true } } },
        orderBy: { checkInAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAllRecords(params: {
    userId?: string; shiftId?: string; status?: AttendanceStatus; startDate?: Date; endDate?: Date; page?: number; limit?: number;
  }) {
    const { userId, shiftId, status, startDate, endDate, page = 1, limit = 30 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userId) where.userId = userId;
    if (shiftId) where.shiftId = shiftId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.checkInAt = {};
      if (startDate) where.checkInAt.gte = startDate;
      if (endDate) where.checkInAt.lte = endDate;
    }
    const [data, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true } },
          shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        },
        orderBy: { checkInAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDailyReport(date: Date) {
    const base = new Date(date);
    base.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);

    const [staffs, shifts, records, leaves] = await Promise.all([
      this.prisma.user.findMany({ where: { role: { in: ['MANAGER', 'CASHIER'] as any }, isActive: true }, select: { id: true, name: true, role: true } }),
      this.listShifts(false),
      this.prisma.attendanceRecord.findMany({
        where: { checkInAt: { gte: base, lte: end } },
        include: { user: { select: { id: true, name: true, role: true } }, shift: { select: { id: true, name: true, startTime: true, endTime: true } } },
      }),
      this.prisma.attendanceLeaveRequest.findMany({
        where: { date: base, status: 'APPROVED' as any },
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
    ]);

    const rows = staffs.map((staff) => {
      const record = records.find((r) => r.userId === staff.id);
      const leave = leaves.find((l) => l.userId === staff.id);
      if (record) return { type: 'PRESENT', ...record };
      if (leave) {
        return {
          type: 'ABSENT_APPROVED',
          id: `leave-${leave.id}`,
          user: leave.user,
          checkInAt: null,
          distanceMeters: null,
          status: 'EXCUSED',
          notes: `${leave.type}: ${leave.reason || '-'}${leave.managerNote ? ` (catatan manager: ${leave.managerNote})` : ''}`,
          shift: null,
        };
      }
      return {
        type: 'ABSENT',
        id: `absent-${staff.id}`,
        user: staff,
        checkInAt: null,
        distanceMeters: null,
        status: 'ABSENT',
        notes: 'Tidak melakukan absen pada jam kerja hari ini',
        shift: shifts[0] || null,
      };
    });

    return { date: base, data: rows };
  }

  async deleteRecord(id: string, actorId: string) {
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } }, shift: { select: { id: true, name: true } } },
    });
    if (!existing) throw new NotFoundException('Data absensi tidak ditemukan');

    await this.prisma.attendanceRecord.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: AuditAction.DELETE,
      entity: 'AttendanceRecord',
      entityId: id,
      metadata: { userId: existing.userId, shiftId: existing.shiftId, checkInAt: existing.checkInAt, status: existing.status },
    });

    return { success: true };
  }

  async listShifts(includeInactive = false) {
    return this.prisma.workShift.findMany({ where: includeInactive ? {} : { isActive: true }, orderBy: { startTime: 'asc' } });
  }

  async createShift(dto: { name: string; startTime: string; endTime: string; earlyWindowMinutes?: number; lateToleranceMinutes?: number }) {
    const exists = await this.prisma.workShift.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Nama shift sudah digunakan');
    return this.prisma.workShift.create({ data: { ...dto } });
  }

  async updateShift(id: string, dto: { name?: string; startTime?: string; endTime?: string; earlyWindowMinutes?: number; lateToleranceMinutes?: number; isActive?: boolean }) {
    const shift = await this.prisma.workShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift tidak ditemukan');
    return this.prisma.workShift.update({ where: { id }, data: dto });
  }

  async deleteShift(id: string) {
    const shift = await this.prisma.workShift.findUnique({ where: { id }, include: { _count: { select: { attendanceRecords: true } } } });
    if (!shift) throw new NotFoundException('Shift tidak ditemukan');
    if (shift._count.attendanceRecords > 0) {
      throw new BadRequestException('Shift tidak bisa dihapus karena sudah memiliki data absensi. Nonaktifkan saja.');
    }
    await this.prisma.workShift.delete({ where: { id } });
    return { success: true };
  }

  async getSetting() {
    return this.prisma.attendanceSetting.findUnique({ where: { id: 'default' } });
  }

  async upsertSetting(dto: { venueName?: string; locationLat: number; locationLng: number; radiusMeters?: number }) {
    return this.prisma.attendanceSetting.upsert({ where: { id: 'default' }, update: { ...dto }, create: { id: 'default', ...dto } });
  }

  async getActiveShifts() {
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const shifts = await this.listShifts(false);
    return shifts.filter((shift) => {
      const startMinutes = timeToMinutes(shift.startTime);
      const earlyBound = startMinutes - shift.earlyWindowMinutes;
      const lateBound = timeToMinutes(shift.endTime);
      const nowMinutes = timeToMinutes(nowStr);
      return nowMinutes >= earlyBound && nowMinutes <= lateBound;
    });
  }

  async createLeaveRequest(userId: string, role: string, dto: { type: 'SICK' | 'PERMIT' | 'OTHER'; date: string; reason?: string }) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const existingPendingOrApproved = await this.prisma.attendanceLeaveRequest.findFirst({
      where: { userId, date, status: { in: ['PENDING', 'APPROVED'] as any } },
    });
    if (existingPendingOrApproved) {
      throw new ConflictException('Pengajuan izin untuk tanggal ini sudah ada dan masih aktif');
    }

    return this.prisma.attendanceLeaveRequest.create({
      data: {
        userId,
        date,
        type: dto.type,
        reason: dto.reason,
        status: role === 'MANAGER' ? 'APPROVED' : 'PENDING',
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  }

  async getMyLeaveRequests(userId: string) {
    return this.prisma.attendanceLeaveRequest.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  }

  async getLeaveRequests(status?: string) {
    return this.prisma.attendanceLeaveRequest.findMany({
      where: status ? { status: status as any } : {},
      include: { user: { select: { id: true, name: true, role: true } }, approver: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { date: 'desc' }],
    });
  }

  async reviewLeaveRequest(id: string, approverId: string, dto: { status: 'APPROVED' | 'REJECTED'; managerNote?: string }) {
    const leave = await this.prisma.attendanceLeaveRequest.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Pengajuan tidak ditemukan');
    if (leave.status !== 'PENDING') throw new BadRequestException('Pengajuan ini sudah diproses');

    return this.prisma.attendanceLeaveRequest.update({
      where: { id },
      data: {
        status: dto.status,
        managerNote: dto.managerNote,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });
  }

  async deleteLeaveRequest(id: string, actorId: string) {
    const leave = await this.prisma.attendanceLeaveRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!leave) throw new NotFoundException('Pengajuan izin tidak ditemukan');

    await this.prisma.attendanceLeaveRequest.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: AuditAction.DELETE,
      entity: 'AttendanceLeaveRequest',
      entityId: id,
      metadata: { userId: leave.userId, date: leave.date, status: leave.status, type: leave.type },
    });

    return { success: true };
  }
}
