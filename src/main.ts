import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Création de l'application

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
}

bootstrap().catch(err => {
  console.error('Erreur lors du démarrage de l\'application:', err);
});
