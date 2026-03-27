import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { WaitingListService } from './waiting-list.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WaitingStatus } from '@prisma/client';

class AddWaitingListDto {
  @IsOptional() @IsString() guestName?: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() preferredTableId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() @Min(1) partySize?: number;
}

@ApiTags('Waiting List')
@Controller('waiting-list')
export class WaitingListController {
  constructor(private svc: WaitingListService) {}

  @Get('public/display')
  publicDisplay() {
    return this.svc.list();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  list(@Query('status') status?: WaitingStatus) {
    return this.svc.list(status);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER' as any, 'CASHIER' as any)
  add(@Body() dto: AddWaitingListDto, @CurrentUser() user: any) {
    return this.svc.add(dto, user.id);
  }

  @Patch(':id/call')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER' as any, 'CASHIER' as any)
  call(@Param('id') id: string) {
    return this.svc.updateStatus(id, WaitingStatus.CALLED);
  }

  @Patch(':id/done')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER' as any, 'CASHIER' as any)
  done(@Param('id') id: string) {
    return this.svc.updateStatus(id, WaitingStatus.DONE);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER' as any, 'CASHIER' as any)
  cancel(@Param('id') id: string) {
    return this.svc.updateStatus(id, WaitingStatus.CANCELLED);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('OWNER' as any, 'MANAGER' as any)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
