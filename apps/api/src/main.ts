import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import * as express from 'express';
const compression = require('compression');

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = (process.env.CORS_ORIGIN || 'http://localhost:3000')
        .split(',').map(o => o.trim());
      if (!origin || allowed.includes(origin)) callback(null, true);
      else callback(new Error(`CORS: origin ${origin} tidak diizinkan`));
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.setGlobalPrefix('api/v1');

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Billiard POS API v2')
      .setDescription('Billiard Billing + Cafe POS (tanpa IoT)')
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🎱 Billiard POS API v2 running on port ${port}`);
}

process.on('uncaughtException', err => { console.error('[Fatal]', err); process.exit(1); });
process.on('unhandledRejection', err => { console.error('[Fatal]', err); process.exit(1); });

bootstrap();
