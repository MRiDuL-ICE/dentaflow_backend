import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FastifyRequest } from 'fastify';
import { REDIS_CLIENT } from './database/database.module';
import Redis from 'ioredis';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // ── Fastify plugins ───────────────────────────────────
  await app.register(await import('@fastify/helmet'));

  await app.register(await import('@fastify/cors'), {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
  });

  await app.register(await import('@fastify/multipart'), {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for X-rays
  });

  const redisClient = app.get<Redis>(REDIS_CLIENT);

  await app.register(await import('@fastify/rate-limit'), {
    global: true,
    max: 100,
    timeWindow: '15 minutes',
    redis: redisClient,
    keyGenerator: (req: FastifyRequest) =>
      `${req.ip}:${(req.headers['x-clinic-slug'] as string) ?? 'global'}`,
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: 'Too many requests — slow down',
    }),
  });

  // ── Global prefix ─────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Global validation ─────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger (dev only) ────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('DentaFlow API')
      .setDescription('Intelligent multi-tenant dental clinic management platform')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-clinic-slug' }, 'clinic-slug')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ── Listen ────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API:      http://localhost:${port}/api`);
  console.log(`📋 Swagger:  http://localhost:${port}/api/docs`);
  console.log(`🐇 RabbitMQ: http://localhost:15672`);
}

void bootstrap();
