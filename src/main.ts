import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';


// Création de l'application

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Documentation API EcoDeli')
    .setDescription('Il s\'agit de la documentation de l\'API de l\'application EcoDeli.')
    .setTermsOfService('https://ecodeli.remythibaut.fr')
    .setVersion('1.0')
    .addServer('https;//app.ecodeli.remythibaut.fr', "Backend de l'application EcoDeli")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, {jsonDocumentUrl: 'swagger/json',});

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT || 3500);
}

bootstrap().catch(err => {
  console.error('Erreur lors du démarrage de l\'application:', err);
});
