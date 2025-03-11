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
    'GMAIL_USER',
    'GMAIL_PASS',
    'MONGO_URL',
    'DATABASE_URL',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'MINIO_ENDPOINT',
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
        const cachedSecret = await this.cacheManager.get<string>(secretName);
        if (cachedSecret) {
          this.logger.log(`Secret ${secretName} trouvé dans le cache.`);
          return cachedSecret;
        } else {
          const secret = await this.azureKeyVaultService.getSecret(secretName);
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
      secret = await this.azureKeyVaultService.getSecret(secretName);
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
}
