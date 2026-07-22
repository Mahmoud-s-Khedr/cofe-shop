import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { IdParamDto } from '../common/dto/id-param.dto';
import { AdminService } from './admin.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminUserResponseDto, AdminUsersListResponseDto } from './dto/admin-response.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List users with optional filters (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated user list', type: AdminUsersListResponseDto })
  listUsers(@Query() query: ListUsersQueryDto): Promise<Record<string, unknown>> {
    return this.adminService.listUsers(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Get user details (admin only)' })
  @ApiResponse({ status: 200, description: 'User details', type: AdminUserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found', type: ErrorResponseDto })
  getUserDetails(@Param() params: IdParamDto): Promise<Record<string, unknown>> {
    return this.adminService.getUserDetails(params.id);
  }

  @Patch(':id/status')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: "Update a user's status, e.g. to block them (admin only)" })
  @ApiResponse({ status: 200, description: 'User status updated', type: AdminUserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found', type: ErrorResponseDto })
  updateUserStatus(
    @Param() params: IdParamDto,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<Record<string, unknown>> {
    return this.adminService.updateUserStatus(params.id, dto);
  }
}
