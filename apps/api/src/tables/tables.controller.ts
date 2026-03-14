// ─── tables.controller.ts ─────────────────────────────────────────────────────

import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { TablesService, CreateTableDto, UpdateTableDto } from './tables.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TableStatus } from '@prisma/client';

class SetStatusDto {
  @IsIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'])
  status: TableStatus;
}

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get()
  @Roles('OWNER' as any, 'DEVELOPER' as any, 'MANAGER' as any, 'CASHIER' as any)
  findAll(@Query('includeInactive') inc?: string) {
    return this.tablesService.findAll(inc === 'true');
  }

  @Get(':id')
  @Roles('OWNER' as any, 'DEVELOPER' as any, 'MANAGER' as any, 'CASHIER' as any)
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Post()
  @Roles('DEVELOPER' as any)
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.create(dto);
  }

  @Patch(':id')
  @Roles('OWNER' as any, 'DEVELOPER' as any)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser() user: any,
  ) {
    return this.tablesService.update(id, dto, user.role);
  }

  @Delete(':id')
  @Roles('DEVELOPER' as any)
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }

  // Manual override status (tanpa IoT)
  @Patch(':id/status')
  @Roles('DEVELOPER' as any, 'OWNER' as any)
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.tablesService.setStatus(id, dto.status, user.role);
  }
}
