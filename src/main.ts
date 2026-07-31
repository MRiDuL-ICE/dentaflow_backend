import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FastifyRequest } from 'fastify';
import { REDIS_CLIENT } from './database/database.module';
import Redis from 'ioredis';
import fastifyRateLimit from '@fastify/rate-limit';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  // Use Winston as NestJS logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Fastify plugins ───────────────────────────────────
  await app.register(await import('@fastify/helmet'));

//  console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);

  await app.register(await import('@fastify/cors'), {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-clinic-slug'],
    credentials: true,
  });

  await app.register(await import('@fastify/multipart'), {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for X-rays
  });

  const redisClient = app.get<Redis>(REDIS_CLIENT);

  await app.register(fastifyRateLimit, {
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
  app.setGlobalPrefix('api/v1');

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
    SwaggerModule.setup('api/v1/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ── Listen ────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`🚀 API running on http://localhost:${port}/api/v1`, 'Bootstrap');

  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📋 Swagger: http://localhost:${port}/api/v1/docs`, 'Bootstrap');
  }
}

void bootstrap();
