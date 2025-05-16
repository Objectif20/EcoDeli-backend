import { Body, Controller, Post, UseGuards, Patch, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { DesktopJwtGuard } from 'src/common/guards/desktop-jwt.guard';
import { MobileJwtGuard } from 'src/common/guards/mobile-jwt.guard';

@ApiTags('Admin Authentication')
@Controller('mobile/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login client (sans 2FA)' })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('login-2fa')
  @ApiOperation({ summary: 'Login client avec 2FA' })
  async loginA2F(@Body() body: { email: string; password: string; code: string }) {
    return this.authService.loginA2F(body.email, body.password, body.code);
  }

  @Post('enable-2fa')
  @UseGuards(MobileJwtGuard)
  @ApiOperation({ summary: 'Générer une secret key 2FA et un QR code' })
  async enable2FA(@Req() req) {
    return this.authService.enableA2F(req.body.user_id);
  }

  @Post('validate-2fa')
  @UseGuards(MobileJwtGuard)
  @ApiOperation({ summary: 'Valider l\'activation 2FA avec le code OTP' })
  async validate2FA(@Req() req, @Body() body: { code: string }) {
    return this.authService.validateA2F(req.body.user_id, body.code);
  }

  @Post('disable-2fa')
  @UseGuards(MobileJwtGuard)
  @ApiOperation({ summary: 'Désactiver 2FA avec le code OTP' })
  async disable2FA(@Req() req, @Body() body: { code: string }) {
    return this.authService.disableA2F(req.body.user_id, body.code);
  }

  @Post('refresh')
  async refresh(@Body() body : {refresh_token : string}): Promise<{ access_token: string }> {
    const refreshToken = body.refresh_token;
    const access_token = await this.authService.refresh(refreshToken);
    return access_token;
  }
}
