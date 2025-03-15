import { Body, Controller, Post, Res, UseGuards,Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { A2FLoginDto } from './dto/a2f-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { A2FDto } from './dto/a2f.dto';
import { Response } from 'express';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';

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
  @UseGuards(AdminJwtGuard)
  async enableA2F(@Req() req): Promise<any> {
    console.log(req.body.admin_id);
    const adminId = req.body.admin_id;
    return this.authService.enableA2F(adminId);
  }

  @Post('2fa/disable')
  @UseGuards(AdminJwtGuard)
  async disableA2F(@Body() a2fDto: A2FDto, @Req() req): Promise<any> {
    const adminId = req.body.admin_id;
    return this.authService.disableA2F(adminId,a2fDto.code);
  }

  @Post('2fa/validate')
  @UseGuards(AdminJwtGuard)
  async validateA2F(@Body() a2fDto: A2FDto,@Req() req): Promise<any> {
    const adminId = req.body.admin_id;
    return this.authService.validateA2F(adminId, a2fDto.code);
  }

  @Post('2fa/login')
  async LoginA2F(@Body() a2fLoginDto: A2FLoginDto, @Res() res: Response): Promise<any> {
    return this.authService.LoginA2F(a2fLoginDto.email, a2fLoginDto.password, a2fLoginDto.code, res);
  }
}
