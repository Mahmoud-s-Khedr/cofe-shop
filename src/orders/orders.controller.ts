import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderNumberParamDto } from './dto/order-number-param.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderAccessToken } from './order-access-token.decorator';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(OptionalJwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a delivery or pickup order (guest or authenticated)' })
  @ApiResponse({ status: 201, description: 'Order created', type: OrderResponseDto })
  createOrder(
    @CurrentUser() user: AuthUser | null,
    @Body() dto: CreateOrderDto,
  ): Promise<Record<string, unknown>> {
    return this.ordersService.createOrder(user, dto);
  }

  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get an order by number (owner, or guest with X-Order-Token)' })
  @ApiResponse({ status: 200, description: 'Order details', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found', type: ErrorResponseDto })
  getOrder(
    @Param() params: OrderNumberParamDto,
    @CurrentUser() user: AuthUser | null,
    @OrderAccessToken() guestToken?: string,
  ): Promise<Record<string, unknown>> {
    return this.ordersService.getOrderForRequester(params.orderNumber, { userId: user?.sub, guestToken });
  }

  @Post(':orderNumber/screenshot')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload the payment screenshot for a pending order' })
  @ApiResponse({ status: 200, description: 'Screenshot attached', type: OrderResponseDto })
  uploadScreenshot(
    @Param() params: OrderNumberParamDto,
    @CurrentUser() user: AuthUser | null,
    @OrderAccessToken() guestToken: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Record<string, unknown>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.ordersService.uploadScreenshot(params.orderNumber, { userId: user?.sub, guestToken }, file);
  }

  @Patch(':orderNumber/cancel')
  @ApiOperation({ summary: 'Cancel a pending or confirmed order' })
  @ApiResponse({ status: 200, description: 'Order cancelled', type: OrderResponseDto })
  cancelOrder(
    @Param() params: OrderNumberParamDto,
    @CurrentUser() user: AuthUser | null,
    @OrderAccessToken() guestToken: string | undefined,
    @Body() dto: CancelOrderDto,
  ): Promise<Record<string, unknown>> {
    return this.ordersService.cancelOrder(params.orderNumber, { userId: user?.sub, guestToken }, dto);
  }
}
