import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsNumber, IsInt, Min, IsIn,
} from 'class-validator';
import { BillingService } from './billing.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SessionStatus } from '@prisma/client';

class CreateBillingSessionDto {
  @IsString()
  tableId: string;

  @IsInt() @Min(1)
  durationMinutes: number;

  @IsOptional() @IsIn(['HOURLY', 'FLEXIBLE', 'PACKAGE'])
  rateType?: 'HOURLY' | 'FLEXIBLE' | 'PACKAGE';

  @IsOptional() @IsString()
  billingPackageId?: string;

  // Identitas tamu — salah satu harus diisi
  @IsOptional() @IsString()
  guestName?: string;

  @IsOptional() @IsString()
  memberId?: string;
}

class ExtendBillingSessionDto {
  @IsInt() @Min(1)
  additionalMinutes: number;

  @IsOptional() @IsString()
  billingPackageId?: string;
}

class MoveBillingSessionDto {
  @IsString()
  targetTableId: string;
}

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('sessions')
  @Roles('OWNER' as any, 'CASHIER' as any)
  createSession(@Body() dto: CreateBillingSessionDto, @CurrentUser() user: any) {
    return this.billingService.createSession(dto, user.id, user.role);
  }

  @Get('sessions')
  @Roles('OWNER' as any, 'CASHIER' as any, 'MANAGER' as any)
  listSessions(
    @Query('status') status?: SessionStatus,
    @Query('tableId') tableId?: string,
    @Query('memberId') memberId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unpaidOnly') unpaidOnly?: string,
  ) {
    return this.billingService.listSessions({
      status,
      tableId,
      memberId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
      unpaidOnly: unpaidOnly === 'true',
    });
  }

  @Get('sessions/active')
  @Roles('OWNER' as any, 'CASHIER' as any)
  getActiveSessions() {
    return this.billingService.getActiveSessions();
  }

  @Get('sessions/:id')
  @Roles('OWNER' as any, 'CASHIER' as any, 'MANAGER' as any)
  getSession(@Param('id') id: string) {
    return this.billingService.getSession(id);
  }

  @Delete('sessions/:id')
  @Roles('OWNER' as any, 'MANAGER' as any)
  removeUnpaidSession(@Param('id') id: string, @CurrentUser() user: any) {
    return this.billingService.removeUnpaidSession(id, user.id);
  }

  @Patch('sessions/:id/extend')
  @Roles('OWNER' as any, 'CASHIER' as any)
  extendSession(
    @Param('id') id: string,
    @Body() dto: ExtendBillingSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.billingService.extendSession(id, dto, user.id);
  }

  @Patch('sessions/:id/move')
  @Roles('OWNER' as any, 'CASHIER' as any)
  moveSession(
    @Param('id') id: string,
    @Body() dto: MoveBillingSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.billingService.moveSession(id, dto, user.id, user.role);
  }

  @Patch('sessions/:id/stop')
  @Roles('OWNER' as any, 'CASHIER' as any)
  stopSession(@Param('id') id: string, @CurrentUser() user: any) {
    return this.billingService.stopSession(id, user.id);
  }
}
