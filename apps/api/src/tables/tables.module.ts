import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { PrismaModule } from '../common/prisma/prisma.module';

// CATATAN v2: IotModule dependency DIHAPUS

@Module({
  imports: [PrismaModule],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
