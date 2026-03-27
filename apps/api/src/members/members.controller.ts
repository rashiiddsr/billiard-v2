import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { MembersService } from './members.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

class CreateMemberDto {
  @IsString() name: string;
  @IsString() phoneNumber: string;
}

class UpdateMemberDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class ResetMemberCredentialsDto {
  @IsOptional() @IsString() email?: string;
}

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('members')
export class MembersController {
  constructor(private membersService: MembersService) {}

  @Get()
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  listMembers(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.membersService.listMembers({
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post()
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  createMember(@Body() dto: CreateMemberDto, @CurrentUser() user: any) {
    return this.membersService.createMember(dto, user.id);
  }

  @Get('search')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  searchForBilling(@Query('q') q: string) {
    return this.membersService.searchForBilling(q || '');
  }

  @Get('cashier/list')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  listMembersForCashier(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.membersService.listMembers({
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post('cashier/create')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  createMemberForCashier(@Body() dto: CreateMemberDto, @CurrentUser() user: any) {
    return this.membersService.createMember(dto, user.id);
  }

  @Patch('cashier/:id/reset-credentials')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  resetCredentialsForCashier(
    @Param('id') id: string,
    @Body() dto: ResetMemberCredentialsDto,
    @CurrentUser() user: any,
  ) {
    return this.membersService.resetCredentials(id, user.id, dto.email);
  }

  @Patch('cashier/:id')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  updateMemberForCashier(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: any,
  ) {
    return this.membersService.updateMember(id, dto, user.id);
  }

  @Get('profile/me')
  @Roles('MEMBER' as any)
  getMyProfile(@CurrentUser() user: any) {
    return this.membersService.getMyProfile(user.id);
  }

  @Get(':id')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any, 'MEMBER' as any)
  getMember(@Param('id') id: string, @CurrentUser() user: any) {
    return this.membersService.getMember(id, user.id, user.role);
  }

  @Patch(':id/reset-credentials')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  resetCredentials(
    @Param('id') id: string,
    @Body() dto: ResetMemberCredentialsDto,
    @CurrentUser() user: any,
  ) {
    return this.membersService.resetCredentials(id, user.id, dto.email);
  }

  @Patch(':id')
  @Roles('OWNER' as any, 'MANAGER' as any, 'CASHIER' as any)
  updateMember(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: any,
  ) {
    return this.membersService.updateMember(id, dto, user.id);
  }
}
