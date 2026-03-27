// tables.service.ts — v2
// Perubahan dari v1:
//   - Hapus semua dependency IotService
//   - Hapus testing mode (MAINTENANCE) — meja hanya AVAILABLE / OCCUPIED
//   - Hapus iotDeviceId, relayChannel, gpioPin dari DTO dan validasi

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  IsString, IsNumber, IsOptional, IsBoolean, Min,
} from 'class-validator';
import { PrismaService } from '../common/prisma/prisma.service';
import { SessionStatus, TableStatus } from '@prisma/client';

export class CreateTableDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) hourlyRate: number;
  @IsOptional() @IsString() status?: TableStatus;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateTableDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) hourlyRate?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() status?: TableStatus;
}

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  private sortByNameNatural<T extends { name: string }>(items: T[]) {
    return [...items].sort((a, b) =>
      a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }),
    );
  }

  async findAll(includeInactive = false) {
    const tables = await this.prisma.table.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        billingSessions: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: {
            createdBy: { select: { id: true, name: true } },
            member: { select: { id: true, name: true, memberNumber: true } },
          },
        },
      },
    });
    return this.sortByNameNatural(tables);
  }

  async findOne(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: {
        billingSessions: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            member: { select: { id: true, name: true, memberNumber: true } },
          },
        },
      },
    });
    if (!table) throw new NotFoundException('Meja tidak ditemukan');
    return table;
  }

  async create(dto: CreateTableDto) {
    const existingName = await this.prisma.table.findUnique({ where: { name: dto.name } });
    if (existingName) throw new ConflictException('Nama meja sudah digunakan');

    const nextId = await this.generateNextTableId();

    return this.prisma.table.create({
      data: {
        id: nextId,
        name: dto.name,
        description: dto.description,
        hourlyRate: dto.hourlyRate,
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async update(id: string, dto: UpdateTableDto) {
    const existing = await this.findOne(id);

    const hasActiveBilling = existing.billingSessions.some(
      (s: any) => s.status === SessionStatus.ACTIVE,
    );
    if (hasActiveBilling) {
      throw new BadRequestException('Meja tidak bisa diubah saat billing berjalan');
    }

    if (dto.name !== undefined) {
      const sameName = await this.prisma.table.findUnique({ where: { name: dto.name } });
      if (sameName && sameName.id !== id) throw new ConflictException('Nama meja sudah digunakan');
    }

    return this.prisma.table.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { billingSessions: { select: { id: true, status: true } } },
    });
    if (!table) throw new NotFoundException('Meja tidak ditemukan');

    const hasActive = table.billingSessions.some((s) => s.status === SessionStatus.ACTIVE);
    if (hasActive || table.status === TableStatus.OCCUPIED) {
      throw new BadRequestException('Meja tidak bisa dihapus saat billing berjalan');
    }
    if (table.billingSessions.length > 0) {
      throw new BadRequestException('Meja tidak bisa dihapus karena sudah memiliki riwayat billing');
    }

    await this.prisma.table.delete({ where: { id } });
    return { message: 'Meja berhasil dihapus' };
  }

  // Manual toggle status oleh OWNER tanpa IoT
  async setStatus(id: string, status: TableStatus) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { billingSessions: { where: { status: 'ACTIVE' }, take: 1 } },
    });
    if (!table) throw new NotFoundException('Meja tidak ditemukan');

    if (
      status === TableStatus.AVAILABLE &&
      table.billingSessions.length > 0
    ) {
      throw new BadRequestException(
        'Tidak bisa set AVAILABLE saat ada sesi billing aktif',
      );
    }

    return this.prisma.table.update({ where: { id }, data: { status } });
  }

  private async generateNextTableId() {
    const tables = await this.prisma.table.findMany({
      select: { id: true },
      where: { id: { startsWith: 'table-' } },
      orderBy: { id: 'asc' },
    });

    let maxNumber = 0;
    for (const t of tables) {
      const match = /^table-(\d+)$/.exec(t.id);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!Number.isNaN(num)) maxNumber = Math.max(maxNumber, num);
      }
    }
    return `table-${String(maxNumber + 1).padStart(2, '0')}`;
  }
}
