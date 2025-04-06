import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { AzureKeyVaultService } from './../../config/azure-keyvault.config';
import Bottleneck from 'bottleneck';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  private secretsList = [
    'STRIPE_SK_SECRET',
    'GMAIL_PASS',
    'MONGO_URL',
    'DATABASE_URL',
    'MINIO_SECRET_KEY',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_SECRET',
    'ONESIGNAL_USER_AUTH_KEY',
    "ONESIGNAL_REST_API_KEY"
  ];

  private limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 250,
  });

  constructor(
    private configService: ConfigService,
    private azureKeyVaultService: AzureKeyVaultService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async loadAllSecrets(): Promise<void> {
    const env = this.configService.get<string>('NODE_ENV');
    const secrets: { [key: string]: string } = {};

    const loadSecret = async (secretName: string) => {
      if (env === 'dev') {
        const secret = this.configService.get<string>(secretName);
        return secret;
      } else {
        const keyVaultSecret = this.mapSecretName(secretName);
        const cachedSecret = await this.cacheManager.get<string>(secretName);
        if (cachedSecret) {
          this.logger.log(`Secret ${secretName} trouvé dans le cache.`);
          return cachedSecret;
        } else {
          const secret = await this.azureKeyVaultService.getSecret(keyVaultSecret);
          await this.cacheManager.set(secretName, secret, 86400);
          this.logger.log(`Secret ${secretName} chargé depuis Azure Key Vault et mis en cache.`);
          return secret;
        }
      }
    };

    const promises = this.secretsList.map((secretName) =>
      this.limiter.schedule(() => loadSecret(secretName))
    );

    const loadedSecrets = await Promise.all(promises);

    this.secretsList.forEach((secretName, index) => {
      secrets[secretName] = loadedSecrets[index] || '';
      this.cacheManager.set(secretName, secrets[secretName], 86400);
      this.logger.log(`Secret ${secretName} enregistré dans le cache.`);
    });
  }

  async loadSecret(secretName: string): Promise<string | null> {
    const env = this.configService.get<string>('NODE_ENV');
    const cachedSecret = await this.cacheManager.get<string>(secretName);

    if (cachedSecret) {
      this.logger.log(`Secret ${secretName} trouvé dans le cache.`);
      return cachedSecret;
    }

    this.logger.log(`Chargement du secret ${secretName}...`);
    let secret: string;

    if (env === 'dev') {
      secret = this.configService.get<string>(secretName) || '';
      this.logger.log(`Secret ${secretName} chargé depuis la configuration.`);
    } else {
      const keyVaultSecret = this.mapSecretName(secretName);
      secret = await this.azureKeyVaultService.getSecret(keyVaultSecret);
      this.logger.log(`Secret ${secretName} chargé depuis Azure Key Vault.`);
    }

    await this.cacheManager.set(secretName, secret, 86400);
    this.logger.log(`Secret ${secretName} mis en cache.`);
    return secret;
  }

  async getSecret(name: string): Promise<string | null> {
    const secret = await this.cacheManager.get<string>(name);
    return secret;
  }

  hasSecret(name: string): boolean {
    const exists = !!this.cacheManager.get<string>(name);
    return exists;
  }

  private mapSecretName(secretName: string): string {
    switch (secretName) {
      case 'STRIPE_SK_SECRET':
        return 'key-StripeSkSecret-prod';
      case 'GMAIL_PASS':
        return 'key-GmailPass-prod';
      case 'MINIO_SECRET_KEY':
        return 'key-MinIo-prod';
      case 'MINIO_ENCRYPTION_KEY' : 
        return 'key-MinIoEncryption-prod';
      case 'MONGO_URL':
        return 'key-MongoUrl-prod';
      case 'DATABASE_URL':
        return 'key-DataBaseUrl-prod';
      case 'JWT_ACCESS_SECRET':
        return 'key-JwtAccessSecret-prod';  
      case 'JWT_REFRESH_SECRET':
        return 'key-JwtRefreshSecret-prod';
      case 'ONESIGNAL_USER_AUTH_KEY':
        return "key-OnesignalUserAuthKey-prod";
      case 'ONESIGNAL_REST_API_KEY':
        return "key-AppOneSignalId-prod";
      default:
        throw new Error(`Secret name ${secretName} is not mapped.`);
    }
  }
}
