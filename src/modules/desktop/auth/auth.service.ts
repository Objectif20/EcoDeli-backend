import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from 'src/config/jwt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: NestJwtService,
    private readonly configService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; refresh_token: string } | { two_factor_required: boolean }> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new UnauthorizedException('Incorrect password');

    if (admin.two_factor_enabled) {
      return { two_factor_required: true };
    }

    const { access_token, refresh_token } = this.generateJwt(admin);
    return { access_token, refresh_token };
  }

  async loginA2F(
    email: string,
    password: string,
    code: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin || !admin.two_factor_enabled) throw new UnauthorizedException('2FA not enabled');

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new UnauthorizedException('Incorrect password');

    const isValidOtp = speakeasy.totp.verify({
      secret: admin.otp,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('Invalid OTP code');

    const { access_token, refresh_token } = this.generateJwt(admin);
    return { access_token, refresh_token };
  }

  async enableA2F(adminId: string): Promise<{ secret: string; qrCode: string }> {
    const secret = speakeasy.generateSecret({ length: 20 });
    const qrCodeImageUrl = await qrcode.toDataURL(secret.otpauth_url);

    await this.adminRepository.update(adminId, { otp: secret.base32 });

    return { secret: secret.base32, qrCode: qrCodeImageUrl };
  }

  async validateA2F(adminId: string, code: string): Promise<{ message: string }> {
    const admin = await this.adminRepository.findOne({ where: { admin_id: adminId } });
    if (!admin) throw new UnauthorizedException('User not found');

    const isValidOtp = speakeasy.totp.verify({
      secret: admin.otp,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('Invalid OTP code');

    admin.two_factor_enabled = true;
    await this.adminRepository.save(admin);

    return { message: '2FA enabled' };
  }

  async disableA2F(adminId: string, code: string): Promise<{ message: string }> {
    const admin = await this.adminRepository.findOne({ where: { admin_id: adminId } });
    if (!admin) throw new UnauthorizedException('User not found');

    const isValidOtp = speakeasy.totp.verify({
      secret: admin.otp,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('Invalid OTP code');

    await this.adminRepository.update(adminId, { otp: '', two_factor_enabled: false });

    return { message: '2FA disabled' };
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const refreshSecret = this.configService.getJwtRefreshSecret();
      const decoded = this.jwtService.verify(refreshToken, { secret: refreshSecret });

      if (!decoded.admin_id) throw new UnauthorizedException('Invalid refresh token');

      const admin = await this.adminRepository.findOne({ where: { admin_id: decoded.admin_id } });
      if (!admin) throw new UnauthorizedException('User not found');

      const accessSecret = this.configService.getJwtAccessSecret();
      const accessToken = this.jwtService.sign(
        { admin_id: admin.admin_id, roles: admin.super_admin ? ['SUPER_ADMIN'] : ['ADMIN'] },
        { secret: accessSecret, expiresIn: '1d' },
      );

      return { access_token: accessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateJwt(admin: Admin): { access_token: string; refresh_token: string } {
    const accessSecret = this.configService.getJwtAccessSecret();
    const refreshSecret = this.configService.getJwtRefreshSecret();

    const accessToken = this.jwtService.sign(
      { admin_id: admin.admin_id, roles: admin.super_admin ? ['SUPER_ADMIN'] : ['ADMIN'] },
      { secret: accessSecret, expiresIn: '1d' },
    );

    const refreshToken = this.jwtService.sign(
      { admin_id: admin.admin_id },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    return { access_token: accessToken, refresh_token: refreshToken };
  }
}
