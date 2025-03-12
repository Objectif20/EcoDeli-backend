import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { A2FLoginDto } from './dto/a2f-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { A2FDto } from './dto/a2f.dto';
import { Response } from 'express';

@Controller('admin/auth') 
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response): Promise<any> {
    return this.authService.login(loginDto.email, loginDto.password, res);
  }

  @Post('logout')
  async logout(@Res() res: Response): Promise<any> {
    return this.authService.logout(res);
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Res() res: Response): Promise<any> {
    return this.authService.refresh(res, refreshTokenDto.token);
  }

  @Post('2fa/enable')
  async enableA2F(@Body() adminId: string): Promise<any> {
    return this.authService.enableA2F(adminId);
  }

  @Post('2fa/disable')
  async disableA2F(@Body() a2fDto: A2FDto): Promise<any> {
    return this.authService.disableA2F(a2fDto.adminId, a2fDto.code);
  }

  @Post('2fa/validate')
  async validateA2F(@Body() a2fDto: A2FDto): Promise<any> {
    return this.authService.validateA2F(a2fDto.adminId, a2fDto.code);
  }

  @Post('2fa/login')
  async LoginA2F(@Body() a2fLoginDto: A2FLoginDto, @Res() res: Response): Promise<any> {
    return this.authService.LoginA2F(a2fLoginDto.email, a2fLoginDto.password, a2fLoginDto.code, res);
  }
}
