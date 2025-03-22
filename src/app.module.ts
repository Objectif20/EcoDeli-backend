import { Module, Global, OnModuleInit } from '@nestjs/common';
import { SecretsModule } from './config/secrets.module';
import { SecretsService } from './common/services/secrets.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { getDatabaseConfig } from './config/postgres.config';
import { getMongoConfig } from './config/mongodb.config';
import * as nodemailer from 'nodemailer';
import { MailService } from './common/services/mail/mail.service';
import MinioConfigService from './config/minio.config';
import { BackModule } from './modules/back/back.module';
import { GuardsModule } from './common/guards/guards.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from './config/jwt.service';
import { MinioService } from './common/services/file/minio.service';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  imports: [
    // Importations de la gestion des secrets et de la configuration des bases de données
    SecretsModule,
    TypeOrmModule.forRootAsync({
      useFactory: async (secretsService: SecretsService) => {
        const databaseUrl = await secretsService.loadSecret('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('Impossible de récupérer l\'URL de la base de données.');
        }
        return getDatabaseConfig(secretsService);
      },
      inject: [SecretsService],
    }),
    MongooseModule.forRootAsync({
      useFactory: async (secretsService: SecretsService) => {
        const mongoUrl = await secretsService.loadSecret('MONGO_URL');
        if (!mongoUrl) {
          throw new Error('Impossible de récupérer l\'URL de MongoDB.');
        }
        return getMongoConfig(secretsService);
      },
      inject: [SecretsService],
    }),

    JwtModule.registerAsync({
      useFactory: async (secretsService: SecretsService) => {
        const accessSecret = await secretsService.loadSecret('JWT_ACCESS_SECRET');
        const refreshSecret = await secretsService.loadSecret('JWT_REFRESH_SECRET');
        if (!accessSecret || !refreshSecret) {
          throw new Error('JWT secrets not found.');
        }
        return {
          secret: accessSecret,
          signOptions: {
            expiresIn: '15m',
          },
          refreshToken: {
            secret: refreshSecret,
            signOptions: {
              expiresIn: '7d',
            },
          },
        };
      },
      inject: [SecretsService],
    }),

    // Importation des différents modules 

    /* Module du BackOffice */
    BackModule,

    /* Module des guards */
    GuardsModule,
    ScheduleModule.forRoot(),

  ],
  providers: [
    JwtService,
    {
      // Configuration du transporteur Gmail pour l'envoi de mails
      provide: 'NodeMailer',
      useFactory: async (secretsService: SecretsService) => {
        const gmailUser = process.env.GMAIL_USER;
        const gmailPass = await secretsService.loadSecret('GMAIL_PASS');

        if (!gmailUser || !gmailPass) {
          throw new Error('Impossible de récupérer les secrets pour le transporteur Gmail.');
        }

        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });
      },
      inject: [SecretsService],
    },

    // Services
    MailService,
    MinioConfigService,
    MinioService,
  ],
  exports: ['NodeMailer', MailService, MinioConfigService, JwtService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly jwtService: JwtService,
    private readonly minioService: MinioService
  ) { }

  async onModuleInit() {
    await this.jwtService.loadSecrets();

    const encryptionKey = process.env.MINIO_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('MINIO_ENCRYPTION_KEY is not defined.');
    }
    await this.minioService.initEncryptionKey(encryptionKey);
  }
}
