import { Module, Global, OnModuleInit } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { SecretsService } from 'src/common/services/secrets.service';
import { AzureKeyVaultService } from './azure-keyvault.config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      isGlobal: true,
    }),
    CacheModule.register({
      ttl: 86400,
      max: 100,
    }),
  ],
  providers: [SecretsService, AzureKeyVaultService],
  exports: [SecretsService],
})
export class SecretsModule {}
