// ─── tables.controller.ts ─────────────────────────────────────────────────────

import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { TablesService, CreateTableDto, UpdateTableDto } from './tables.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TableStatus } from '@prisma/client';

class SetStatusDto {
  @IsIn(['AVAILABLE', 'OCCUPIED'])
  status: TableStatus;
}

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get()
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  findAll(@Query('includeInactive') inc?: string) {
    return this.tablesService.findAll(inc === 'true');
  }

  @Get(':id')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Post()
  @Roles('OWNER' as any)
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.create(dto);
  }

  @Patch(':id')
  @Roles('OWNER' as any)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER' as any)
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }

  // Manual override status (tanpa IoT)
  @Patch(':id/status')
  @Roles('OWNER' as any)
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetStatusDto,
  ) {
    return this.tablesService.setStatus(id, dto.status);
  }
}
