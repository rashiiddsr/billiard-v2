import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsNumber, IsBoolean, Min, Max, IsInt, IsIn,
} from 'class-validator';
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AttendanceStatus } from '@prisma/client';

class CheckInDto {
  @IsString() qrCode: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

class CreateShiftDto {
  @IsString() name: string;
  @IsString() startTime: string;
  @IsString() endTime: string;
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

class CreateLeaveDto {
  @IsIn(['SICK', 'PERMIT', 'OTHER']) type: 'SICK' | 'PERMIT' | 'OTHER';
  @IsString() date: string;
  @IsOptional() @IsString() reason?: string;
}

class ReviewLeaveDto {
  @IsIn(['APPROVED', 'REJECTED']) status: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() managerNote?: string;
}

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('public/display')
  getPublicDisplay() {
    return this.attendanceService.getDisplayPayload();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Post('check-in')
  @Roles('MANAGER' as any, 'CASHIER' as any)
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: any) {
    return this.attendanceService.checkIn(user.id, user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Get('shifts/active-now')
  @Roles('MANAGER' as any, 'CASHIER' as any)
  getActiveShifts() {
    return this.attendanceService.getActiveShifts();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Get('reports/daily')
  @Roles('OWNER' as any, 'MANAGER' as any)
  getDailyReport(@Query('date') date?: string) {
    return this.attendanceService.getDailyReport(date ? new Date(date) : new Date());
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Delete('records/:id')
  @Roles('OWNER' as any, 'MANAGER' as any)
  deleteRecord(@Param('id') id: string, @CurrentUser() user: any) {
    return this.attendanceService.deleteRecord(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Get('shifts')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  listShifts(@Query('includeInactive') inc?: string) {
    return this.attendanceService.listShifts(inc === 'true');
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Post('shifts')
  @Roles('OWNER' as any)
  createShift(@Body() dto: CreateShiftDto) {
    return this.attendanceService.createShift(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Patch('shifts/:id')
  @Roles('OWNER' as any)
  updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.attendanceService.updateShift(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Delete('shifts/:id')
  @Roles('OWNER' as any)
  deleteShift(@Param('id') id: string) {
    return this.attendanceService.deleteShift(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Get('setting')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  getSetting() {
    return this.attendanceService.getSetting();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Patch('setting')
  @Roles('OWNER' as any)
  updateSetting(@Body() dto: UpdateSettingDto) {
    return this.attendanceService.upsertSetting(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Post('leave-requests')
  @Roles('MANAGER' as any, 'CASHIER' as any)
  createLeave(@Body() dto: CreateLeaveDto, @CurrentUser() user: any) {
    return this.attendanceService.createLeaveRequest(user.id, user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Get('leave-requests/my')
  @Roles('MANAGER' as any, 'CASHIER' as any)
  getMyLeaves(@CurrentUser() user: any) {
    return this.attendanceService.getMyLeaveRequests(user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Get('leave-requests')
  @Roles('OWNER' as any, 'MANAGER' as any)
  getLeaveRequests(@Query('status') status?: string) {
    return this.attendanceService.getLeaveRequests(status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Patch('leave-requests/:id/review')
  @Roles('OWNER' as any, 'MANAGER' as any)
  reviewLeave(@Param('id') id: string, @Body() dto: ReviewLeaveDto, @CurrentUser() user: any) {
    return this.attendanceService.reviewLeaveRequest(id, user.id, dto);
  }
}
