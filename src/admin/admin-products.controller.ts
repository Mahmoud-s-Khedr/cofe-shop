import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { IdParamDto } from '../common/dto/id-param.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateAvailabilityDto } from '../products/dto/update-availability.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { ProductResponseDto } from '../products/dto/product-response.dto';
import { ProductsService } from '../products/products.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/products')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product (admin only)' })
  @ApiResponse({ status: 201, description: 'Product created', type: ProductResponseDto })
  create(@Body() dto: CreateProductDto): Promise<Record<string, unknown>> {
    return this.productsService.createProduct(dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Update a product (admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found', type: ErrorResponseDto })
  update(@Param() params: IdParamDto, @Body() dto: UpdateProductDto): Promise<Record<string, unknown>> {
    return this.productsService.updateProduct(params.id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Deactivate a product (soft delete, admin only)' })
  @ApiResponse({ status: 200, description: 'Product deactivated' })
  @ApiResponse({ status: 404, description: 'Product not found', type: ErrorResponseDto })
  remove(@Param() params: IdParamDto): Promise<Record<string, unknown>> {
    return this.productsService.deleteProduct(params.id);
  }

  @Patch(':id/availability')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Toggle whether a product can currently be ordered (admin only)' })
  @ApiResponse({ status: 200, description: 'Availability updated', type: ProductResponseDto })
  updateAvailability(
    @Param() params: IdParamDto,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<Record<string, unknown>> {
    return this.productsService.updateAvailability(params.id, dto);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Upload or replace the product image (admin only)' })
  @ApiResponse({ status: 200, description: 'Image attached', type: ProductResponseDto })
  async uploadImage(
    @Param() params: IdParamDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Record<string, unknown>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.productsService.replaceImage(params.id, file);
  }

  @Delete(':id/image')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Remove the product image (admin only)' })
  @ApiResponse({ status: 200, description: 'Image removed', type: ProductResponseDto })
  removeImage(@Param() params: IdParamDto): Promise<Record<string, unknown>> {
    return this.productsService.removeImage(params.id);
  }
}
