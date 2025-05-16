import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/common/entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtService } from 'src/config/jwt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly jwtService: NestJwtService,
    private readonly configService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string } | { two_factor_required: boolean }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Incorrect password');

    if (user.two_factor_enabled) {
      return { two_factor_required: true };
    }

    const { access_token, refresh_token } = this.generateJwt(user);
    return { access_token, refresh_token };
  }

  async loginA2F(email: string, password: string, code: string): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !user.two_factor_enabled) throw new UnauthorizedException('2FA not enabled');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Incorrect password');

    const isValidOtp = speakeasy.totp.verify({
      secret: user.secret_totp,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('Invalid OTP code');

    const { access_token, refresh_token } = this.generateJwt(user);
    return { access_token, refresh_token };
  }

  async enableA2F(userId: string): Promise<{ secret: string, qrCode: string }> {
    const secret = speakeasy.generateSecret({ length: 20 });
    const qrCodeImageUrl = await qrcode.toDataURL(secret.otpauth_url);

    await this.userRepository.update(userId, { secret_totp: secret.base32 });

    return { secret: secret.base32, qrCode: qrCodeImageUrl };
  }

  async validateA2F(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isValidOtp = speakeasy.totp.verify({
      secret: user.secret_totp,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('Invalid OTP code');

    user.two_factor_enabled = true;
    await this.userRepository.save(user);

    return { message: '2FA enabled' };
  }

  async disableA2F(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isValidOtp = speakeasy.totp.verify({
      secret: user.secret_totp,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('Invalid OTP code');

    await this.userRepository.update(userId, { secret_totp: '', two_factor_enabled: false });

    return { message: '2FA disabled' };
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const refreshSecret = this.configService.getJwtRefreshSecret();
      const decoded = this.jwtService.verify(refreshToken, { secret: refreshSecret });

      if (!decoded.user_id) throw new UnauthorizedException('Invalid refresh token');

      const user = await this.userRepository.findOne({ where: { user_id: decoded.user_id } });
      if (!user) throw new UnauthorizedException('User not found');

      const accessSecret = this.configService.getJwtAccessSecret();
      const accessToken = this.jwtService.sign(
        { user_id: user.user_id },
        { secret: accessSecret, expiresIn: '15m' }
      );

      return { access_token: accessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateJwt(user: Users): { access_token: string; refresh_token: string } {
    const accessSecret = this.configService.getJwtAccessSecret();
    const refreshSecret = this.configService.getJwtRefreshSecret();

    const accessToken = this.jwtService.sign(
      { user_id: user.user_id },
      { secret: accessSecret, expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { user_id: user.user_id },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    return { access_token: accessToken, refresh_token: refreshToken };
  }
}
