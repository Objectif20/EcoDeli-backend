import { Body, Controller, Post, Res, UseGuards,Req, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { A2FLoginDto } from './dto/a2f-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { A2FDto } from './dto/a2f.dto';
import { Response } from 'express';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { NewPasswordDto } from './dto/new-password.dto';
import { A2FNewPasswordDto } from './dto/a2f-new-password.dto';

@Controller('admin/auth') 
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response): Promise<{ access_token: string } | { two_factor_required: boolean }> {
    return this.authService.login(loginDto.email, loginDto.password, res);
  }

  @Post('logout')
  async logout(@Res() res: Response): Promise<{ message: string }> {
    return this.authService.logout(res);
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Res() res: Response): Promise<{ access_token: string }> {
    return this.authService.refresh(res, refreshTokenDto.token);
  }

  @Post('2fa/enable')
  @UseGuards(AdminJwtGuard)
  async enableA2F(@Req() req): Promise<{ secret: string, qrCode: string }> {
    console.log(req.body.admin_id);
    const adminId = req.body.admin_id;
    return this.authService.enableA2F(adminId);
  }

  @Post('2fa/disable')
  @UseGuards(AdminJwtGuard)
  async disableA2F(@Body() a2fDto: A2FDto, @Req() req): Promise<{ message: string }> {
    const adminId = req.body.admin_id;
    return this.authService.disableA2F(adminId,a2fDto.code);
  }

  @Post('2fa/validate')
  @UseGuards(AdminJwtGuard)
  async validateA2F(@Body() a2fDto: A2FDto,@Req() req): Promise<{ message: string }> {
    const adminId = req.body.admin_id;
    return this.authService.validateA2F(adminId, a2fDto.code);
  }

  @Post('2fa/login')
  async LoginA2F(@Body() a2fLoginDto: A2FLoginDto, @Res() res: Response): Promise<{ access_token: string }> {
    return this.authService.LoginA2F(a2fLoginDto.email, a2fLoginDto.password, a2fLoginDto.code, res);
  }

  @Post('forgotPassword')
  async forgotPassword(@Body() forgotPasswordDto : ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Patch('password')
  async newPassword(@Body() newPassword : NewPasswordDto) : Promise<{ message: string } | { two_factor_required: boolean }> {
    return this.authService.newPassword(newPassword);
  }

  @Patch('2fa/password')
  async newPasswordA2F(@Body() a2fNewPasswod : A2FNewPasswordDto) : Promise<{ message: string }> {
    return this.authService.newPasswordA2F(a2fNewPasswod);
  }

}
