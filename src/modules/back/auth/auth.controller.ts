import { Body, Controller, Post, Res, UseGuards, Req, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { A2FLoginDto } from './dto/a2f-login.dto';
import { A2FDto } from './dto/a2f.dto';
import { Response, Request } from 'express';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { NewPasswordDto } from './dto/new-password.dto';
import { A2FNewPasswordDto } from './dto/a2f-new-password.dto';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login Admin',
    description: 'Authenticates the admin and generates an access token.',
    operationId: 'adminLogin',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access token or two factor required response.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized, invalid credentials.',
  })
  async login(@Body() loginDto: LoginDto, @Res() res: Response): Promise<{ access_token: string } | { two_factor_required: boolean }> {
    const message = this.authService.login(loginDto.email, loginDto.password, res);
    console.log(message);
    return message;
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout Admin',
    description: 'Logs the admin out and invalidates the refresh token.',
    operationId: 'adminLogout',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out.',
  })
  async logout(@Res() res: Response): Promise<{ message: string }> {
    return this.authService.logout(res);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh Admin Access Token',
    description: 'Refreshes the access token using the refresh token.',
    operationId: 'adminRefreshToken',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully refreshed access token.',
  })
  async refresh(@Req() req: Request): Promise<{ access_token: string }> {
    const refreshToken = (req as any).cookies?.refresh_token;
    const access_token = await this.authService.refresh(refreshToken);
    return access_token;
  }

  @Post('2fa/enable')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Enable 2FA for Admin',
    description: 'Enables Two Factor Authentication for the admin.',
    operationId: 'adminEnable2FA',
  })
  @ApiResponse({
    status: 200,
    description: '2FA successfully enabled, returns secret and QR code.',
  })
  async enableA2F(@Req() req): Promise<{ secret: string, qrCode: string }> {
    console.log(req.body.admin_id);
    const adminId = req.body.admin_id;
    return this.authService.enableA2F(adminId);
  }

  @Post('2fa/disable')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Disable 2FA for Admin',
    description: 'Disables Two Factor Authentication for the admin.',
    operationId: 'adminDisable2FA',
  })
  @ApiBody({ type: A2FDto })
  @ApiResponse({
    status: 200,
    description: '2FA successfully disabled.',
  })
  async disableA2F(@Body() a2fDto: A2FDto, @Req() req): Promise<{ message: string }> {
    const adminId = req.body.admin_id;
    return this.authService.disableA2F(adminId, a2fDto.code);
  }

  @Post('2fa/validate')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Validate 2FA Code for Admin',
    description: 'Validates the provided 2FA code.',
    operationId: 'adminValidate2FA',
  })
  @ApiBody({ type: A2FDto })
  @ApiResponse({
    status: 200,
    description: '2FA successfully validated.',
  })
  async validateA2F(@Body() a2fDto: A2FDto, @Req() req): Promise<{ message: string }> {
    const adminId = req.body.admin_id;
    return this.authService.validateA2F(adminId, a2fDto.code);
  }

  @Post('2fa/login')
  @ApiOperation({
    summary: 'Login with 2FA for Admin',
    description: 'Logs in the admin with their 2FA code.',
    operationId: 'adminLoginWith2FA',
  })
  @ApiBody({ type: A2FLoginDto })
  @ApiResponse({
    status: 200,
    description: '2FA login successful, returns login response.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized, invalid credentials or 2FA code.',
  })
  async LoginA2F(@Body() a2fLoginDto: A2FLoginDto, @Res() res: Response): Promise<{ access_token: string }> {
    return this.authService.LoginA2F(a2fLoginDto.email, a2fLoginDto.password, a2fLoginDto.code, res);
  }

  @Post('forgotPassword')
  @ApiOperation({
    summary: 'Forgot Admin Password',
    description: 'Initiates the process to reset the admin\'s password.',
    operationId: 'adminForgotPassword',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset instructions sent to email.',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Patch('password')
  @ApiOperation({
    summary: 'Set New Admin Password',
    description: 'Sets a new password for the admin.',
    operationId: 'adminSetNewPassword',
  })
  @ApiBody({ type: NewPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password successfully updated.',
  })
  async newPassword(@Body() newPassword: NewPasswordDto): Promise<{ message: string } | { two_factor_required: boolean }> {
    return this.authService.newPassword(newPassword);
  }

  @Patch('2fa/password')
  @ApiOperation({
    summary: 'Set New Admin Password with 2FA',
    description: 'Sets a new password with 2FA validation for the admin.',
    operationId: 'adminSetNewPasswordWith2FA',
  })
  @ApiBody({ type: A2FNewPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password successfully updated with 2FA.',
  })
  async newPasswordA2F(@Body() a2fNewPasswod: A2FNewPasswordDto): Promise<{ message: string }> {
    return this.authService.newPasswordA2F(a2fNewPasswod);
  }
}