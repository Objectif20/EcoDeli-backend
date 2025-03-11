import { MongooseModuleOptions } from '@nestjs/mongoose';
import { SecretsService } from 'src/common/services/secrets.service';

export const getMongoConfig = async (secretsService: SecretsService): Promise<MongooseModuleOptions> => {

  const mongoUri = await secretsService.getSecret('MONGO_URL');

  if (!mongoUri) {
    throw new Error('MONGO_URL est introuvable.');
  }

  console.log('MONGO_URL récupéré avec succès!');

  return { uri: mongoUri };
};
