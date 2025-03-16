import { Injectable, UnauthorizedException, Response, Inject, Res } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { JwtService } from 'src/config/jwt.service';
import * as nodemailer from 'nodemailer';
import { NewPasswordDto } from './dto/new-password.dto';
import { A2FNewPasswordDto } from './dto/a2f-new-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: NestJwtService,  
    private readonly configService: JwtService, 
    @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
  ) {}

  async login(email: string, password: string, @Res() res): Promise<{ access_token: string } | { two_factor_required: boolean }> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new UnauthorizedException('Incorrect password');

    if (admin.two_factor_enabled) {
      return { two_factor_required: true };
    }

    return this.setAuthCookies(res, admin);
  }

  async LoginA2F(email: string, password: string, code: string, @Res() res): Promise<{ access_token: string }> {
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

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const refreshSecret = this.configService.getJwtRefreshSecret();
      const decoded = this.jwtService.verify(refreshToken, { secret: refreshSecret });
  
      const admin = await this.adminRepository.findOne({ where: { admin_id: decoded.admin_id } });
      if (!admin) throw new UnauthorizedException('User not found');
  
      const accessSecret = this.configService.getJwtAccessSecret();
      const accessToken = this.jwtService.sign(
        { admin_id: admin.admin_id, roles: admin.super_admin ? ['SUPER_ADMIN'] : ['ADMIN'] },
        { secret: accessSecret, expiresIn: '15m' }
      );
        
      return { access_token: accessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(@Response() res): Promise<{ message: string }> {
    res.clearCookie('refresh_token', { httpOnly: true, secure: true, sameSite: 'strict' });
    return res.json({ message: 'Successfull logout' });
  }

  async enableA2F(adminId: any): Promise<{ secret: string, qrCode: string }> {
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

  async validateA2F(adminId: string, code: string): Promise<{ message: string }> {
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('User not found');
  
    const passwordCode = uuidv4(); 
  
    admin.password_code = passwordCode;
    await this.adminRepository.save(admin);
  
    try {
      const fromEmail = this.mailer.options.auth.user;
      const info = await this.mailer.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Réinitialisation de mot de passe',
        text: 'Voici votre code temporaire pour réinitialiser votre mot de passe: ' + passwordCode,
      });
    } catch (error) {
      throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    }

    return { message: 'Email sent' };
  }


  async newPassword(newPassword: NewPasswordDto): Promise<{ message: string } | { two_factor_required: boolean }> {
    const admin = await this.adminRepository.findOne({ where: { password_code: newPassword.secretCode } });

    if (!admin) throw new UnauthorizedException('Invalid code');

    if (admin.two_factor_enabled) {
      return { two_factor_required: true };
    }
  
    const hashedPassword = await bcrypt.hash(newPassword.password, 10);
    admin.password = hashedPassword;
    admin.password_code = null;
    await this.adminRepository.save(admin);

    return { message: 'Password updated' };

  }

  async newPasswordA2F(newPassword: A2FNewPasswordDto): Promise<{ message: string }> {

    const admin = await this.adminRepository.findOne({ where: { password_code: newPassword.secretCode } });
    if (!admin) throw new UnauthorizedException('Invalid code');

    const isValidOtp = speakeasy.totp.verify({
      secret: admin.otp,
      encoding: 'base32',
      token: newPassword.code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('Invalid OTP code');

    const hashedPassword = await bcrypt.hash(newPassword.password, 10);
    admin.password = hashedPassword;
    admin.password_code = null;
    await this.adminRepository.save(admin);

    return { message: 'Password updated' };

  }

  private async setAuthCookies(res, admin: Admin) {
    const accessSecret = this.configService.getJwtAccessSecret(); 
    const accessToken = this.jwtService.sign(
      { admin_id: admin.admin_id, roles: admin.super_admin ? ['SUPER_ADMIN'] : ['ADMIN'] },
      { secret: accessSecret, expiresIn: '15m' }
    );

    const refreshSecret = this.configService.getJwtRefreshSecret();
    const refreshToken = this.jwtService.sign(
      { admin_id: admin.admin_id },
      { secret: refreshSecret, expiresIn: '7d' }
    );

    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ access_token: accessToken });
  }
}

