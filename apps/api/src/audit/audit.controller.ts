import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('OWNER')
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }
}
