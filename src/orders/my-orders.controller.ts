import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { OrderListResponseDto, OrderResponseDto } from './dto/order-response.dto';
import { OrderNumberParamDto } from './dto/order-number-param.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('me/orders')
@UseGuards(JwtAuthGuard)
export class MyOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's order history" })
  @ApiResponse({ status: 200, description: 'Paginated order history', type: OrderListResponseDto })
  listMyOrders(@CurrentUser() user: AuthUser, @Query() query: ListMyOrdersQueryDto): Promise<Record<string, unknown>> {
    return this.ordersService.listMyOrders(user.sub, query);
  }

  @Get(':orderNumber')
  @ApiOperation({ summary: "Get one of the current user's orders" })
  @ApiResponse({ status: 200, description: 'Order details', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found', type: ErrorResponseDto })
  getMyOrder(@CurrentUser() user: AuthUser, @Param() params: OrderNumberParamDto): Promise<Record<string, unknown>> {
    return this.ordersService.getMyOrder(user.sub, params.orderNumber);
  }
}
