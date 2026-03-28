// ─── waiting-list.service.ts ──────────────────────────────────────────────────

import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WaitingStatus } from '@prisma/client';

@Injectable()
export class WaitingListService {
  constructor(private prisma: PrismaService) {}

  async list(status?: WaitingStatus, memberId?: string) {
    return this.prisma.waitingList.findMany({
      where: {
        ...(status ? { status } : { status: { in: ['WAITING', 'CALLED'] } }),
        ...(memberId ? { memberId } : {}),
      },
      include: {
        member: { select: { id: true, name: true, memberNumber: true, phoneNumber: true } },
        preferredTable: { select: { id: true, name: true, status: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async add(
    dto: {
      guestName?: string;
      memberId?: string;
      preferredTableId?: string;
      notes?: string;
      partySize?: number;
    },
    createdById: string,
  ) {
    if (!dto.guestName && !dto.memberId) {
      throw new BadRequestException('Masukkan nama tamu atau pilih member');
    }

    if (dto.memberId) {
      const member = await this.prisma.user.findUnique({ where: { id: dto.memberId } });
      if (!member || member.role !== 'MEMBER') {
        throw new NotFoundException('Member tidak ditemukan');
      }

      // Cek duplikat member di antrian
      const existing = await this.prisma.waitingList.findFirst({
        where: { memberId: dto.memberId, status: { in: ['WAITING', 'CALLED'] } },
      });
      if (existing) {
        throw new BadRequestException('Member sudah ada di antrian');
      }
    }

    return this.prisma.waitingList.create({
      data: { ...dto, createdById },
      include: {
        member: { select: { id: true, name: true, memberNumber: true } },
        preferredTable: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(id: string, newStatus: WaitingStatus) {
    const entry = await this.prisma.waitingList.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entri tidak ditemukan');

    const data: any = { status: newStatus };
    if (newStatus === 'CALLED') data.calledAt = new Date();
    if (newStatus === 'DONE' || newStatus === 'CANCELLED') data.doneAt = new Date();

    return this.prisma.waitingList.update({
      where: { id },
      data,
      include: {
        member: { select: { id: true, name: true, memberNumber: true } },
      },
    });
  }

  async remove(id: string) {
    const entry = await this.prisma.waitingList.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entri tidak ditemukan');
    await this.prisma.waitingList.delete({ where: { id } });
    return { success: true };
  }
}
