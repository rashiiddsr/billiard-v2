// ─── members.module.ts ────────────────────────────────────────────────────────
// apps/api/src/members/members.module.ts

import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}


// ─── waiting-list.module.ts ───────────────────────────────────────────────────
// apps/api/src/waiting-list/waiting-list.module.ts

/*
import { Module } from '@nestjs/common';
import { WaitingListController } from './waiting-list.controller';
import { WaitingListService } from './waiting-list.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WaitingListController],
  providers: [WaitingListService],
})
export class WaitingListModule {}
*/


// ─── attendance.module.ts ─────────────────────────────────────────────────────
// apps/api/src/attendance/attendance.module.ts

/*
import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
*/
