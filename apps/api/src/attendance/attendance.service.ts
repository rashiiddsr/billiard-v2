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

// ─── Haversine formula ────────────────────────────────────────────────────────

function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // radius bumi dalam meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Parse HH:MM ke menit sejak tengah malam ─────────────────────────────────

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── Check-in ──────────────────────────────────────────────────────────────

  async checkIn(
    userId: string,
    dto: { shiftId: string; lat?: number; lng?: number },
  ) {
    // Ambil setting lokasi
    const setting = await this.prisma.attendanceSetting.findUnique({
      where: { id: 'default' },
    });
    if (!setting) {
      throw new BadRequestException(
        'Setting lokasi absensi belum dikonfigurasi. Hubungi Owner.',
      );
    }

    // Ambil shift
    const shift = await this.prisma.workShift.findUnique({
      where: { id: dto.shiftId },
    });
    if (!shift || !shift.isActive) {
      throw new NotFoundException('Shift tidak ditemukan atau tidak aktif');
    }

    // Cek duplikat absen di shift + hari yang sama
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: {
        userId,
        shiftId: dto.shiftId,
        checkInAt: { gte: todayStart, lte: todayEnd },
      },
    });
    if (existing) {
      throw new ConflictException('Anda sudah absen untuk shift ini hari ini');
    }

    // Hitung jarak
    let distanceMeters: number | null = null;
    let geoStatus: AttendanceStatus = AttendanceStatus.ON_TIME;

    if (dto.lat !== undefined && dto.lng !== undefined) {
      distanceMeters = Math.round(
        haversineMeters(
          dto.lat,
          dto.lng,
          Number(setting.locationLat),
          Number(setting.locationLng),
        ),
      );

      if (distanceMeters > setting.radiusMeters) {
        geoStatus = AttendanceStatus.REJECTED;
      }
    }

    // Hitung status waktu (hanya jika tidak REJECTED)
    let finalStatus: AttendanceStatus = geoStatus;
    if (geoStatus !== AttendanceStatus.REJECTED) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const shiftStartMinutes = timeToMinutes(shift.startTime);

      const earlyBound = shiftStartMinutes - shift.earlyWindowMinutes;
      const lateBound = shiftStartMinutes + shift.lateToleranceMinutes;

      if (nowMinutes < earlyBound) {
        finalStatus = AttendanceStatus.EARLY;
      } else if (nowMinutes <= lateBound) {
        finalStatus = AttendanceStatus.ON_TIME;
      } else {
        finalStatus = AttendanceStatus.LATE;
      }
    }

    // Simpan record
    const record = await this.prisma.attendanceRecord.create({
      data: {
        userId,
        shiftId: dto.shiftId,
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
      afterData: {
        shiftId: dto.shiftId,
        status: finalStatus,
        distanceMeters,
        lat: dto.lat,
        lng: dto.lng,
      },
    });

    return {
      record,
      distanceMeters,
      radiusMeters: setting.radiusMeters,
      message: this.getStatusMessage(finalStatus, distanceMeters, shift.startTime),
    };
  }

  private getStatusMessage(
    status: AttendanceStatus,
    distance: number | null,
    shiftStart: string,
  ): string {
    const s = status as string;
    if (s === 'ON_TIME') return '✅ Absensi berhasil! Tepat waktu.';
    if (s === 'LATE') return `⚠️ Absensi tercatat, tetapi Anda terlambat (shift mulai ${shiftStart}).`;
    if (s === 'EARLY') return `⏰ Absensi tercatat, tetapi Anda terlalu awal sebelum window absen dimulai.`;
    return `❌ Absensi ditolak. Anda berada ${distance}m dari lokasi kerja.`;
  }

  // ─── Riwayat absen diri sendiri ────────────────────────────────────────────

  async getMyRecords(
    userId: string,
    params: { startDate?: Date; endDate?: Date; page?: number; limit?: number },
  ) {
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
        include: {
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

  // ─── Semua riwayat absen (manager/owner) ───────────────────────────────────

  async getAllRecords(params: {
    userId?: string;
    shiftId?: string;
    status?: AttendanceStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
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

  // ─── CRUD Shift ────────────────────────────────────────────────────────────

  async listShifts(includeInactive = false) {
    return this.prisma.workShift.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async createShift(dto: {
    name: string;
    startTime: string;
    endTime: string;
    earlyWindowMinutes?: number;
    lateToleranceMinutes?: number;
  }) {
    const exists = await this.prisma.workShift.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Nama shift sudah digunakan');

    return this.prisma.workShift.create({ data: { ...dto } });
  }

  async updateShift(
    id: string,
    dto: {
      name?: string;
      startTime?: string;
      endTime?: string;
      earlyWindowMinutes?: number;
      lateToleranceMinutes?: number;
      isActive?: boolean;
    },
  ) {
    const shift = await this.prisma.workShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift tidak ditemukan');

    return this.prisma.workShift.update({ where: { id }, data: dto });
  }

  async deleteShift(id: string) {
    const shift = await this.prisma.workShift.findUnique({
      where: { id },
      include: { _count: { select: { attendanceRecords: true } } },
    });
    if (!shift) throw new NotFoundException('Shift tidak ditemukan');
    if (shift._count.attendanceRecords > 0) {
      throw new BadRequestException(
        'Shift tidak bisa dihapus karena sudah memiliki data absensi. Nonaktifkan saja.',
      );
    }

    await this.prisma.workShift.delete({ where: { id } });
    return { success: true };
  }

  // ─── Setting lokasi ────────────────────────────────────────────────────────

  async getSetting() {
    return this.prisma.attendanceSetting.findUnique({ where: { id: 'default' } });
  }

  async upsertSetting(dto: {
    venueName?: string;
    locationLat: number;
    locationLng: number;
    radiusMeters?: number;
  }) {
    return this.prisma.attendanceSetting.upsert({
      where: { id: 'default' },
      update: { ...dto },
      create: { id: 'default', ...dto },
    });
  }

  // ─── Ambil shift aktif sekarang ────────────────────────────────────────────

  async getActiveShifts() {
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const shifts = await this.listShifts(false);

    // Kembalikan semua shift aktif yang windownya mencakup sekarang
    return shifts.filter((shift) => {
      const startMinutes = timeToMinutes(shift.startTime);
      const earlyBound = startMinutes - shift.earlyWindowMinutes;
      const lateBound = timeToMinutes(shift.endTime);
      const nowMinutes = timeToMinutes(nowStr);
      // Window absen: dari earlyBound sampai akhir shift
      return nowMinutes >= earlyBound && nowMinutes <= lateBound;
    });
  }
}
