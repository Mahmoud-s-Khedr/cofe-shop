import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendRegistrationCodeDto } from './dto/resend-registration-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { LogoutResponseDto, OtpSentResponseDto, TokenResponseDto } from './dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register with name/phone/password and request a verification code' })
  @ApiResponse({ status: 201, description: 'Verification code sent', type: OtpSentResponseDto })
  @ApiResponse({ status: 409, description: 'Phone number already registered', type: ErrorResponseDto })
  register(@Body() dto: RegisterDto): Promise<Record<string, unknown>> {
    return this.authService.register(dto);
  }

  @Post('resend-registration-code')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend the registration verification code' })
  @ApiResponse({ status: 201, description: 'Verification code resent', type: OtpSentResponseDto })
  @ApiResponse({ status: 400, description: 'No pending registration found for this phone number', type: ErrorResponseDto })
  resendRegistrationCode(@Body() dto: ResendRegistrationCodeDto): Promise<Record<string, unknown>> {
    return this.authService.resendRegistrationCode(dto);
  }

  @Post('verify-registration')
  @ApiOperation({ summary: 'Verify the code and activate the account' })
  @ApiResponse({ status: 201, description: 'Account activated; returns access + refresh tokens', type: TokenResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired code', type: ErrorResponseDto })
  verifyRegistration(@Body() dto: VerifyRegistrationDto): Promise<Record<string, unknown>> {
    return this.authService.verifyRegistration(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with phone number and password' })
  @ApiResponse({ status: 201, description: 'Returns access + refresh tokens', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials', type: ErrorResponseDto })
  login(@Body() dto: LoginDto): Promise<Record<string, unknown>> {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password-reset verification code' })
  @ApiResponse({ status: 201, description: 'Code sent (or silently ignored if phone not found)', type: OtpSentResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<Record<string, unknown>> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password using the verification code' })
  @ApiResponse({ status: 201, description: 'Password updated; returns new tokens', type: TokenResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired code', type: ErrorResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<Record<string, unknown>> {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({ status: 201, description: 'Returns new access + refresh tokens', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token', type: ErrorResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<Record<string, unknown>> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke refresh token and logout' })
  @ApiResponse({ status: 201, description: 'Logged out successfully', type: LogoutResponseDto })
  logout(@Body() dto: LogoutDto): Promise<Record<string, unknown>> {
    return this.authService.logout(dto);
  }
}
