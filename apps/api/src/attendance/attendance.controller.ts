import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsNumber, IsBoolean, Min, Max, IsInt,
} from 'class-validator';
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AttendanceStatus } from '@prisma/client';

class CheckInDto {
  @IsString() shiftId: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

class CreateShiftDto {
  @IsString() name: string;
  @IsString() startTime: string;   // HH:MM
  @IsString() endTime: string;     // HH:MM
  @IsOptional() @IsInt() @Min(0) earlyWindowMinutes?: number;
  @IsOptional() @IsInt() @Min(0) lateToleranceMinutes?: number;
}

class UpdateShiftDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsInt() @Min(0) earlyWindowMinutes?: number;
  @IsOptional() @IsInt() @Min(0) lateToleranceMinutes?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateSettingDto {
  @IsOptional() @IsString() venueName?: string;
  @IsNumber() locationLat: number;
  @IsNumber() locationLng: number;
  @IsOptional() @IsInt() @Min(50) @Max(50000) radiusMeters?: number;
}

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  // ─── Check-in (semua staff) ───────────────────────────────────────────────

  @Post('check-in')
  @Roles('MANAGER' as any, 'CASHIER' as any)
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: any) {
    return this.attendanceService.checkIn(user.id, dto);
  }

  // ─── Shift aktif sekarang ─────────────────────────────────────────────────

  @Get('shifts/active-now')
  @Roles('MANAGER' as any, 'CASHIER' as any)
  getActiveShifts() {
    return this.attendanceService.getActiveShifts();
  }

  // ─── Riwayat saya ─────────────────────────────────────────────────────────

  @Get('my-records')
  @Roles('MANAGER' as any, 'CASHIER' as any)
  getMyRecords(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.attendanceService.getMyRecords(user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  // ─── Semua record (owner/manager) ─────────────────────────────────────────

  @Get('records')
  @Roles('OWNER' as any, 'MANAGER' as any)
  getAllRecords(
    @Query('userId') userId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.attendanceService.getAllRecords({
      userId,
      shiftId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  // ─── Shift management (owner) ─────────────────────────────────────────────

  @Get('shifts')
  @Roles('MANAGER' as any, 'CASHIER' as any)
  listShifts(@Query('includeInactive') inc?: string) {
    return this.attendanceService.listShifts(inc === 'true');
  }

  @Post('shifts')
  @Roles('OWNER' as any)
  createShift(@Body() dto: CreateShiftDto) {
    return this.attendanceService.createShift(dto);
  }

  @Patch('shifts/:id')
  @Roles('OWNER' as any)
  updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.attendanceService.updateShift(id, dto);
  }

  @Delete('shifts/:id')
  @Roles('OWNER' as any)
  deleteShift(@Param('id') id: string) {
    return this.attendanceService.deleteShift(id);
  }

  // ─── Setting lokasi (owner) ────────────────────────────────────────────────

  @Get('setting')
  @Roles('OWNER' as any, 'MANAGER' as any)
  getSetting() {
    return this.attendanceService.getSetting();
  }

  @Patch('setting')
  @Roles('OWNER' as any)
  updateSetting(@Body() dto: UpdateSettingDto) {
    return this.attendanceService.upsertSetting(dto);
  }
}
