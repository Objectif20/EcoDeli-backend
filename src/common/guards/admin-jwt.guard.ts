import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token JWT manquant');
    }

    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_ACCESS_SECRET });

      if (!payload.roles || !payload.roles.includes('ADMIN') && !payload.roles.includes('SUPER_ADMIN')) {
        throw new ForbiddenException('Accès réservé aux administrateurs');
      }

      if (!request.body) {
        request.body = {};
      }
      
      request.body.admin_id = payload.admin_id;

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
