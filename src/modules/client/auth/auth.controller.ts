import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';
import { A2FDto } from './dto/a2f.dto';
import { A2FLoginDto } from './dto/a2f-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { NewPasswordDto } from './dto/new-password.dto';
import { A2FNewPasswordDto } from './dto/a2f-new-password.dto';
import { loginResponse } from './type';

@ApiTags('Authentication')
@Controller('client/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticates the user and generates an access token.',
    operationId: 'loginUser',
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
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
  ): Promise<
    loginResponse | { two_factor_required: boolean } | { message: string } | { confirmed: boolean }
  > {
    const message = this.authService.login(loginDto.email, loginDto.password, res);
    return message;
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Logs the user out and invalidates the refresh token.',
    operationId: 'logoutUser',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Logout successful' },
          },
        },
      },
    },
  })
  async logout(@Res() res: Response): Promise<{ message: string }> {
    return this.authService.logout(res);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Refreshes the access token using the refresh token.',
    operationId: 'refreshToken',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully refreshed access token.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', example: 'new-access-token' },
          },
        },
      },
    },
  })
  async refresh(@Req() req: Request): Promise<{ access_token: string }> {
    const refreshToken = (req as any).cookies?.refresh_token;
    const access_token = await this.authService.refresh(refreshToken);
    return access_token;
  }

  @Post('account/validate')
  @ApiOperation({
    summary: 'Validate user account',
    description: 'Validates the user account using a password code.',
    operationId: 'validateAccount',
  })
  @ApiBody({ type: String })
  @ApiResponse({
    status: 200,
    description: 'Account successfully validated.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Account validated' },
          },
        },
      },
    },
  })
  async validateAccount(@Body() body: { secretCode: string }): Promise<{ message: string }> {
    const { secretCode } = body;
    return this.authService.validateAccount(secretCode);
  }

  @Post('2fa/enable')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Enable 2FA for user',
    description: 'Enables Two Factor Authentication for the user.',
    operationId: 'enable2FA',
  })
  @ApiResponse({
    status: 200,
    description: '2FA successfully enabled, returns secret and QR code.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            secret: { type: 'string', example: 'secret-key' },
            qrCode: { type: 'string', example: 'base64-encoded-qr-code' },
          },
        },
      },
    },
  })
  async enableA2F(@Req() req): Promise<{ secret: string; qrCode: string }> {
    const userId = req.body.user_id;
    return this.authService.enableA2F(userId);
  }

  @Post('a2f/disable')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Disable 2FA for user',
    description: 'Disables Two Factor Authentication for the user.',
    operationId: 'disable2FA',
  })
  @ApiBody({ type: A2FDto })
  @ApiResponse({
    status: 200,
    description: '2FA successfully disabled.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Two-factor authentication disabled' },
          },
        },
      },
    },
  })
  async disableA2F(@Body() a2fDto: A2FDto, @Req() req): Promise<{ message: string }> {
    const userId = req.body.user_id;
    return this.authService.disableA2F(userId, a2fDto.code);
  }

  @Post('a2f/validate')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Validate 2FA code',
    description: 'Validates the provided 2FA code.',
    operationId: 'validate2FA',
  })
  @ApiBody({ type: A2FDto })
  @ApiResponse({
    status: 200,
    description: '2FA successfully validated.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '2FA validated successfully' },
          },
        },
      },
    },
  })
  async validateA2F(@Body() a2fDto: A2FDto, @Req() req): Promise<{ message: string }> {
    const userId = req.body.user_id;
    return this.authService.validateA2F(userId, a2fDto.code);
  }

  @Post('a2f/login')
  @ApiOperation({
    summary: 'Login with 2FA',
    description: 'Logs in the user with their 2FA code.',
    operationId: 'loginWith2FA',
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
  async LoginA2F(
    @Body() a2fLoginDto: A2FLoginDto,
    @Res() res: Response,
  ): Promise<any | { message: string }> {
    return this.authService.LoginA2F(
      a2fLoginDto.email,
      a2fLoginDto.password,
      a2fLoginDto.code,
      res,
    );
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Forgot password',
    description: "Initiates the process to reset the user's password.",
    operationId: 'forgotPassword',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset instructions sent to email.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Password reset email sent' },
          },
        },
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('new-password')
  @ApiOperation({
    summary: 'Set new password',
    description: 'Sets a new password for the user.',
    operationId: 'setNewPassword',
  })
  @ApiBody({ type: NewPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password successfully updated.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Password updated successfully' },
          },
        },
      },
    },
  })
  async newPassword(
    @Body() newPassword: NewPasswordDto,
  ): Promise<{ message: string } | { two_factor_required: boolean }> {
    return this.authService.newPassword(newPassword);
  }

  @Post('a2f/password')
  @ApiOperation({
    summary: 'Set new password with 2FA',
    description: 'Sets a new password with 2FA validation.',
    operationId: 'setNewPasswordWith2FA',
  })
  @ApiBody({ type: A2FNewPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password successfully updated with 2FA.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Password updated with 2FA successfully' },
          },
        },
      },
    },
  })
  async newPasswordA2F(@Body() a2fNewPasswod: A2FNewPasswordDto): Promise<{ message: string }> {
    return this.authService.newPasswordA2F(a2fNewPasswod);
  }

  @Post('extension/login')
  @ApiOperation({
    summary: 'Login user in chrome extension',
    description: 'Authenticates the user and generates an access token.',
    operationId: 'loginUser',
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
  async loginExtension(
    @Body() loginDto: LoginDto,
  ): Promise<
    loginResponse | { two_factor_required: boolean } | { message: string } | { confirmed: boolean }
  > {
    const message = this.authService.loginExtension(loginDto.email, loginDto.password);
    return message;
  }

  @Post('extension/a2f/login')
  @ApiOperation({
    summary: 'Login with 2FA',
    description: 'Logs in the user with their 2FA code.',
    operationId: 'loginWith2FA',
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
  async LoginA2FExtension(@Body() a2fLoginDto: A2FLoginDto): Promise<any | { message: string }> {
    return this.authService.loginA2FExtension(
      a2fLoginDto.email,
      a2fLoginDto.password,
      a2fLoginDto.code,
    );
  }
}
