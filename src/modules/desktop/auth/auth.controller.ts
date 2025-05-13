import { Body, Controller, Post, Res, UseGuards, Req, Patch, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';


@ApiTags('Admin Authentication')
@Controller('desktop/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('test')
  async test() {
    return "coucou"
  }

}
