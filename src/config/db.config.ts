import { registerAs } from '@nestjs/config';

export default registerAs('db', () => ({
  url: process.env.DATABASE_URL ?? '',
  directUrl: process.env.DATABASE_DIRECT_URL ?? '',
}));
