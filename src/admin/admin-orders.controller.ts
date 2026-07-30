import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { OrderNumberParamDto } from '../orders/dto/order-number-param.dto';
import { OrderListResponseDto, OrderResponseDto } from '../orders/dto/order-response.dto';
import { OrdersService } from '../orders/orders.service';
import { ListAdminOrdersQueryDto } from './dto/list-admin-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with filters (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated order list', type: OrderListResponseDto })
  list(@Query() query: ListAdminOrdersQueryDto): Promise<Record<string, unknown>> {
    return this.ordersService.adminListOrders(query);
  }

  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get order details, including invoice information (admin only)' })
  @ApiResponse({ status: 200, description: 'Order details', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found', type: ErrorResponseDto })
  getOrder(@Param() params: OrderNumberParamDto): Promise<Record<string, unknown>> {
    return this.ordersService.adminGetOrder(params.orderNumber);
  }

  @Patch(':orderNumber/status')
  @ApiParam({ name: 'orderNumber', type: String })
  @ApiOperation({ summary: 'Transition an order to a new status (admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid transition', type: ErrorResponseDto })
  updateStatus(
    @CurrentUser() admin: AuthUser,
    @Param() params: OrderNumberParamDto,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<Record<string, unknown>> {
    return this.ordersService.adminTransitionStatus(params.orderNumber, admin.sub, dto.status, {
      reason: dto.reason,
      note: dto.note,
      paymentMethod: dto.paymentMethod,
      bankName: dto.bankName,
    });
  }
}
