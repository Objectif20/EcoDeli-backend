import { Injectable, UnauthorizedException, Response } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string, @Response() res): Promise<any> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new UnauthorizedException('Incorrect password');

    if (admin.two_factor_enabled) {
      return res.json({ two_factor_required: true });
    }

    return this.setAuthCookies(res, admin);
  }

  async LoginA2F(email: string, password: string, code: string, @Response() res): Promise<any> {
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

    return this.setAuthCookies(res, admin);
  }

  async refresh(@Response() res, refreshToken: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      const admin = await this.adminRepository.findOne({ where: { admin_id: decoded.admin_id } });
      if (!admin) throw new UnauthorizedException('User not found');
      
      return this.setAuthCookies(res, admin);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(@Response() res): Promise<any> {
    res.clearCookie('refresh_token', { httpOnly: true, secure: true, sameSite: 'strict' });
    return res.json({ message: 'Successfull logout' });
  }

  async enableA2F(adminId: any): Promise<any> {
    const extractedAdminId = adminId.adminId || adminId; 
  
    const secret = speakeasy.generateSecret({ length: 20 });
    const otpAuthUrl = secret.otpauth_url;
    const qrCodeImageUrl = await qrcode.toDataURL(otpAuthUrl);
  
    await this.adminRepository.update(
      { admin_id: extractedAdminId },
      { otp: secret.base32 }
    );
  
    return { secret: secret.base32, qrCode: qrCodeImageUrl };
  }

  async validateA2F(adminId: string, code: string): Promise<any> {
    const admin = await this.adminRepository.findOne({ where: { admin_id: adminId } });
    if (!admin) throw new UnauthorizedException('User not found');

    const isValidOtp = speakeasy.totp.verify({
      secret: admin.otp,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('invalid OTP code');

    admin.two_factor_enabled = true;
    await this.adminRepository.save(admin);

    return { message: '2FA enabled' };
  }

  async disableA2F(adminId: string, code: string): Promise<any> {
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

  private async setAuthCookies(res, admin: Admin) {
    const accessToken = this.jwtService.sign(
      { admin_id: admin.admin_id, roles: admin.super_admin ? ['SUPER_ADMIN'] : ['ADMIN'] },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }
    );

    const refreshToken = this.jwtService.sign(
      { admin_id: admin.admin_id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
    );

    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ access_token: accessToken });
  }
}
