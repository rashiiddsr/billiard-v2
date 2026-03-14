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
