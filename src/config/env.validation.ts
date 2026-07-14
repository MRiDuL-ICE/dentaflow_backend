import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  ALLOWED_ORIGINS: Joi.string().default('*'),

  // Database
  DATABASE_URL:        Joi.string().uri().required(),
  DATABASE_DIRECT_URL: Joi.string().uri().required(),

  // Supabase
  SUPABASE_URL:              Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

  // Redis
  REDIS_HOST:     Joi.string().default('redis'),
  REDIS_PORT:     Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // RabbitMQ
  RABBITMQ_URL:  Joi.string().required(),
  RABBITMQ_USER: Joi.string().default('guest'),
  RABBITMQ_PASS: Joi.string().default('guest'),

  // JWT
  JWT_SECRET:     Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),

  // AI
  GROQ_API_KEY:        Joi.string().required(),
  HUGGINGFACE_API_KEY: Joi.string().required(),

  // Email
  RESEND_API_KEY: Joi.string().required(),
  EMAIL_FROM:     Joi.string().email().required(),
  APP_URL:        Joi.string().uri().required(),
});
