import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminController } from './admin.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProductsModule, OrdersModule],
  controllers: [AdminController, AdminProductsController, AdminOrdersController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
