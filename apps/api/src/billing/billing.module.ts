import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

// CATATAN v2: JwtModule tidak lagi dibutuhkan di BillingModule
// karena re-auth OWNER sudah dipindahkan ke AuthModule

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
