import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TablesModule } from './tables/tables.module';
import { BillingModule } from './billing/billing.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { FinanceModule } from './finance/finance.module';
import { StockModule } from './stock/stock.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CompanyModule } from './company/company.module';
import { PackagesModule } from './packages/packages.module';
import { PrintModule } from './print/print.module';
// ─── Modul Baru v2 ───────────────────────────────────────────────────────────
import { MembersModule } from './members/members.module';
import { WaitingListModule } from './waiting-list/waiting-list.module';
import { AttendanceModule } from './attendance/attendance.module';

// IotModule DIHAPUS di v2

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || '300'),
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TablesModule,
    BillingModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    FinanceModule,
    StockModule,
    AuditModule,
    NotificationsModule,
    CompanyModule,
    PackagesModule,
    PrintModule,
    // v2
    MembersModule,
    WaitingListModule,
    AttendanceModule,
  ],
})
export class AppModule {}
