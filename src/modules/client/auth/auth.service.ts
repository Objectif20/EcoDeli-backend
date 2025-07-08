import {
  Injectable,
  UnauthorizedException,
  Response,
  Inject,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { JwtService } from 'src/config/jwt.service';
import * as nodemailer from 'nodemailer';
import { NewPasswordDto } from './dto/new-password.dto';
import { A2FNewPasswordDto } from './dto/a2f-new-password.dto';
import { Users } from 'src/common/entities/user.entity';
import { loginResponse } from './type';
import { Client } from 'src/common/entities/client.entity';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Merchant } from 'src/common/entities/merchant.entity';
import { Providers } from 'src/common/entities/provider.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Providers)
    private readonly providerRepository: Repository<Providers>,
    private readonly jwtService: NestJwtService,
    private readonly configService: JwtService,
    @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
  ) {}

  async login(
    email: string,
    password: string,
    @Res() res,
  ): Promise<
    loginResponse | { two_factor_required: boolean } | { message: string } | { confirmed: boolean }
  > {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['clients', 'providers', 'subscriptions'],
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.confirmed) {
      const validateCode = uuidv4();

      user.validate_code = validateCode;
      const savedUser = await this.userRepository.save(user);
      if (!savedUser) {
        throw new BadRequestException('Erreur lors de la génération du code de validation');
      }
      const urlWithCode = `${process.env.OFFICIAL_BACKOFFICE_WEBSITE}/auth/validate/${validateCode}`;

      try {
        const fromEmail = this.mailer.options.auth.user;
        await this.mailer.sendMail({
          from: fromEmail,
          to: email,
          subject: 'Confirmez votre compte Écodeli',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px;">
              <h2>Validation de votre compte</h2>
              <p>Bonjour,</p>
              <p>Merci de votre inscription sur Écodeli.</p>
              <p>Pour finaliser votre inscription et activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
              <a href="${urlWithCode}" style="display: inline-block; padding: 12px 24px; background-color: #264653; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
                Valider mon compte
              </a>
              <p style="margin-top: 20px;">Ce lien est personnel et expirera après un certain délai. Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail.</p>
              <p style="color: #555;">Merci,<br>L'équipe Écodeli</p>
            </div>
            `,
        });
      } catch (error) {
        console.error("Erreur lors de l'envoi de l'email:", error);
        throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
      }

      return res.json({ message: 'User not confirmed', confirmed: false });
    }

    if (user.banned) {
      if (user.ban_date && user.ban_date < new Date()) {
        user.banned = false;
        await this.userRepository.save(user);
      } else {
        return res.status(401).json({ message: 'User is banned' });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    if (user.two_factor_enabled) {
      return res.json({ two_factor_required: true });
    }

    const clientExists = await this.clientRepository.count({
      where: { user: { user_id: user.user_id } },
    });
    const deliverymanExists = await this.deliveryPersonRepository.count({
      where: { user: { user_id: user.user_id } },
    });
    const merchantExists = await this.merchantRepository.count({
      where: { user: { user_id: user.user_id } },
    });
    const providerExists = await this.providerRepository.count({
      where: { user: { user_id: user.user_id } },
    });

    const profile = {
      provider: providerExists > 0,
      merchant: merchantExists > 0,
      client: clientExists > 0,
      deliveryman: deliverymanExists > 0,
    };

    const accessToken = await this.setAuthCookies(res, user);

    const response: loginResponse = {
      access_token: accessToken,
      profile: profile,
    };

    return res.json(response);
  }

  async LoginA2F(email: string, password: string, code: string, @Res() res): Promise<Response> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['clients', 'providers', 'subscriptions'],
    });

    if (!user || !user.two_factor_enabled) {
      return res.status(401).json({ message: '2FA not enabled' });
    }

    if (!user.confirmed) {
      user.confirmed = true;
      await this.userRepository.save(user);
    }

    if (user.banned) {
      if (user.ban_date && user.ban_date < new Date()) {
        user.banned = false;
        await this.userRepository.save(user);
      } else {
        return res.status(401).json({ message: 'User is banned' });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const isValidOtp = speakeasy.totp.verify({
      secret: user.secret_totp,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValidOtp) {
      return res.status(401).json({ message: 'Invalid OTP code' });
    }

    const clientExists = await this.clientRepository.count({
      where: { user: { user_id: user.user_id } },
    });
    const deliverymanExists = await this.deliveryPersonRepository.count({
      where: { user: { user_id: user.user_id } },
    });
    const merchantExists = await this.merchantRepository.count({
      where: { user: { user_id: user.user_id } },
    });
    const providerExists = await this.providerRepository.count({
      where: { user: { user_id: user.user_id } },
    });

    const profile = {
      provider: providerExists > 0,
      merchant: merchantExists > 0,
      client: clientExists > 0,
      deliveryman: deliverymanExists > 0,
    };

    const accessToken = await this.setAuthCookies(res, user);

    const response: loginResponse = {
      access_token: accessToken,
      profile,
    };

    return res.json(response);
  }

  async validateAccount(validate_code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { validate_code: validate_code } });
    if (!user) throw new UnauthorizedException('Invalid code');

    user.confirmed = true;
    await this.userRepository.save(user);

    return { message: 'Account validated' };
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
        { secret: accessSecret, expiresIn: '15m' },
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

  async enableA2F(userId: any): Promise<{ secret: string; qrCode: string }> {
    const extracteduserId = userId.userId || userId;

    const secret = speakeasy.generateSecret({ length: 20 });
    const otpAuthUrl = secret.otpauth_url;
    const qrCodeImageUrl = await qrcode.toDataURL(otpAuthUrl);

    await this.userRepository.update({ user_id: extracteduserId }, { secret_totp: secret.base32 });

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

    if (!isValidOtp) throw new UnauthorizedException('invalid OTP code');

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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('User not found');

    const passwordCode = uuidv4();

    user.password_code = passwordCode;
    await this.userRepository.save(user);
    const urlWithCode = `${process.env.OFFICIAL_WEBSITE}/auth/new-password/${passwordCode}`;
    try {
      const fromEmail = this.mailer.options.auth.user;
      await this.mailer.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px;">
          <h2>Réinitialisation de mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Pour choisir un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>
          <a href="${urlWithCode}" style="display: inline-block; padding: 12px 24px; background-color: #e76f51; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
            Réinitialiser mon mot de passe
          </a>
          <p style="margin-top: 20px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
          <p style="color: #555;">Merci,<br>L'équipe Écodeli</p>
        </div>
        `,
      });
    } catch (error) {
      throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    }

    return { message: 'Email sent' };
  }

  async newPassword(
    newPassword: NewPasswordDto,
  ): Promise<{ message: string } | { two_factor_required: boolean }> {
    const user = await this.userRepository.findOne({
      where: { password_code: newPassword.secretCode },
    });

    if (!user) throw new UnauthorizedException('Invalid code');

    if (user.two_factor_enabled) {
      return { two_factor_required: true };
    }

    const hashedPassword = await bcrypt.hash(newPassword.password, 10);
    user.password = hashedPassword;
    user.password_code = null;
    await this.userRepository.save(user);

    return { message: 'Password updated' };
  }

  async newPasswordA2F(newPassword: A2FNewPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { password_code: newPassword.secretCode },
    });
    if (!user) throw new UnauthorizedException('Invalid code');

    const isValidOtp = speakeasy.totp.verify({
      secret: user.secret_totp,
      encoding: 'base32',
      token: newPassword.code,
      window: 1,
    });

    if (!isValidOtp) throw new UnauthorizedException('Invalid OTP code');

    const hashedPassword = await bcrypt.hash(newPassword.password, 10);
    user.password = hashedPassword;
    user.password_code = null;
    await this.userRepository.save(user);

    return { message: 'Password updated' };
  }

  private async setAuthCookies(res, user: Users): Promise<string> {
    const accessSecret = this.configService.getJwtAccessSecret();
    const accessToken = this.jwtService.sign(
      { user_id: user.user_id },
      { secret: accessSecret, expiresIn: '15m' },
    );

    const refreshSecret = this.configService.getJwtRefreshSecret();
    const refreshToken = this.jwtService.sign(
      { user_id: user.user_id },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return accessToken;
  }
}
