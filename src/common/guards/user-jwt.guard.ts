import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtService } from 'src/config/jwt.service';

@Injectable()
export class ClientJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: JwtService, 
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token JWT manquant');
    }

    const accessToken = this.configService.getJwtAccessSecret();

    try {
      const payload = this.jwtService.verify(token, { secret: accessToken });

      const contentType = request.headers['content-type'] || '';
      const isFormData = contentType.includes('multipart/form-data');

      if (isFormData) {
        (request as any).user = { user_id: payload.user_id };
      } else {
        if (!request.body) {
          request.body = {};
        }
        request.body.user_id = payload.user_id;
      }

      return true;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Token JWT invalide ou expiré');
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }
}

