import { Body, Controller, Delete, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";
import { A2FDto } from "./dto/a2f.dto";
import { A2FLoginDto } from "./dto/a2f-login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { NewPasswordDto } from "./dto/new-password.dto";
import { A2FNewPasswordDto } from "./dto/a2f-new-password.dto";
import { loginResponse } from "./type";


@Controller("client/auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}


    @Post("login")
    async login(@Body() loginDto: LoginDto, @Res() res: Response): Promise<loginResponse | { two_factor_required: boolean }> {
        const message =  this.authService.login(loginDto.email, loginDto.password, res);
        console.log(message);
        return message;
    }

    @Post('logout')
      async logout(@Res() res: Response): Promise<{ message: string }> {
        return this.authService.logout(res);
    }

    @Post('refresh')
      async refresh(@Req() req: Request): Promise<{ access_token: string }> {
          const refreshToken = (req as any).cookies?.refresh_token;
          const access_token = await this.authService.refresh(refreshToken);
          return access_token ;
    }

    @Post("account/validate")
    async validateAccount(password_code : string) : Promise<{ message: string }> {
        return this.authService.validateAccount(password_code);
    }


    @Post('2fa/enable')
    @UseGuards(ClientJwtGuard)
    async enableA2F(@Req() req): Promise<{ secret: string, qrCode: string }> {
    const userId = req.body.user_id;
    return this.authService.enableA2F(userId);
    }

    @Delete('a2f/disable')
    @UseGuards(ClientJwtGuard)
    async disableA2F(@Body() a2fDto: A2FDto, @Req() req): Promise<{ message: string }> {
        const userId = req.body.user_id;
        return this.authService.disableA2F(userId,a2fDto.code);
    }

    @Post('a2f/validate')
    @UseGuards(ClientJwtGuard)
    async validateA2F(@Body() a2fDto: A2FDto,@Req() req): Promise<{ message: string }> {
        const userId = req.body.user_id;
        return this.authService.validateA2F(userId, a2fDto.code);
    }

    @Post('a2f/login')
    async LoginA2F(@Body() a2fLoginDto: A2FLoginDto, @Res() res: Response): Promise<loginResponse> {
        return this.authService.LoginA2F(a2fLoginDto.email, a2fLoginDto.password, a2fLoginDto.code, res);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() forgotPasswordDto : ForgotPasswordDto): Promise<{ message: string }> {
        return this.authService.forgotPassword(forgotPasswordDto.email);
    }

    @Post('new-password')
    async newPassword(@Body() newPassword : NewPasswordDto) : Promise<{ message: string } | { two_factor_required: boolean }> {
        return this.authService.newPassword(newPassword);
    }

    @Post('a2f/password')
    async newPasswordA2F(@Body() a2fNewPasswod : A2FNewPasswordDto) : Promise<{ message: string }> {
        return this.authService.newPasswordA2F(a2fNewPasswod);
    }

}