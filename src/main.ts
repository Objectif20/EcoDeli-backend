import 'dd-trace';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as tracer from 'dd-trace';
import { Request } from 'express';
import * as bodyParser from 'body-parser';

tracer.init({
  service: 'ecodeli-backend',
  env: 'production',
  hostname: 'remythibaut.fr',
  port: 8126,
});

const clientAdminOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ecodeli.remythibaut.fr',
  'https://admin.ecodeli.remythibaut.fr',
  'https://editor.swagger.io',
  'https://doc.api.ecodeli.remythibaut.fr',
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, origin || '*');
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use((req: Request, res, next) => {
    const url = req.url;
    const origin = req.headers.origin;

    if ((url.startsWith('/client') || url.startsWith('/admin')) && clientAdminOrigins.includes(origin || '')) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    if (url.startsWith('/desktop') || url.startsWith('/mobile')) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Credentials', 'false');
    }

    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  app.use('/webhooks/stripe', bodyParser.raw({ type: 'application/json' }));


  const config = new DocumentBuilder()
    .setTitle('Documentation API EcoDeli')
    .setDescription("Il s'agit de la documentation de l'API de l'application EcoDeli.")
    .setTermsOfService('https://ecodeli.remythibaut.fr')
    .setVersion('1.0')
    .addServer('https://app.ecodeli.remythibaut.fr', "Backend de l'application EcoDeli")
    .addServer('http://localhost:3000', "Backend de l'administration EcoDeli")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, { jsonDocumentUrl: 'swagger/json' });

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT || 3500);
}

bootstrap().catch(err => {
  console.error('Erreur lors du démarrage de l\'application:', err);
});
