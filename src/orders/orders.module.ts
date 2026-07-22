import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { MyOrdersController } from './my-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [FilesModule],
  controllers: [OrdersController, MyOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
