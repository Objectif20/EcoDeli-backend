import { Module, OnModuleInit } from '@nestjs/common';
import { SecretsService } from 'src/common/services/secrets.service';
import { SecretsModule } from './secrets.module';
import { getMongoConfig } from './mongodb.config';
import { getDatabaseConfig } from './postgres.config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [SecretsModule],  
})
export class ConfigModule implements OnModuleInit {
  constructor(private readonly secretsService: SecretsService) {}

  async onModuleInit() {
    await this.secretsService.loadAllSecrets();

    const databaseUrl = await this.secretsService.getSecret('DATABASE_URL');
    const mongoUrl = await this.secretsService.getSecret('MONGO_URL');

    if (!databaseUrl || !mongoUrl) {
      throw new Error('Impossible de récupérer les URLs de base de données.');
    }

    const databaseConfig = await getDatabaseConfig(this.secretsService);

    TypeOrmModule.forRoot(databaseConfig); 

    const mongoConfig = await getMongoConfig(this.secretsService);

    if (!mongoConfig.uri) {
      throw new Error('MongoDb URI non défini.');
    }
    MongooseModule.forRoot(mongoConfig.uri);
  }
}
