import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SecretsService } from 'src/common/services/secrets.service';
import { entities } from 'src/common/entities';

export const getDatabaseConfig = async (secretsService: SecretsService): Promise<TypeOrmModuleOptions> => {
  console.log('Accès direct au secret DATABASE_URL...');

  const databaseUrl = await secretsService.getSecret('DATABASE_URL');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL est introuvable.');
  }

  console.log('DATABASE_URL récupéré avec succès!');

  return {
    type: 'postgres',
    url: databaseUrl,
    entities,
    synchronize: false,
    logging: false,
  };
};
