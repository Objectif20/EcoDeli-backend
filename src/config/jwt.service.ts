import { Injectable, OnModuleInit } from '@nestjs/common';
import { SecretsService } from '../common/services/secrets.service';

@Injectable()
export class JwtService implements OnModuleInit {
  private jwtAccessSecret: string;
  private jwtRefreshSecret: string;

  constructor(private readonly secretsService: SecretsService) {}

  // Charger les secrets
  async loadSecrets() {
    const accessSecret = await this.secretsService.loadSecret('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is null');
    }
    this.jwtAccessSecret = accessSecret;
    const refreshSecret = await this.secretsService.loadSecret('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is null');
    }
    this.jwtRefreshSecret = refreshSecret;
  }

  // Appel de loadSecrets au démarrage de l'application
  async onModuleInit() {
    await this.loadSecrets();
  }

  getJwtAccessSecret(): string {
    return this.jwtAccessSecret;
  }

  getJwtRefreshSecret(): string {
    return this.jwtRefreshSecret;
  }
}