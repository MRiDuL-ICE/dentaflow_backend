import { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';

export interface TestAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function loginAs(
  app: NestFastifyApplication,
  email: string,
  password: string,
  clinicSlug: string,
): Promise<TestAuthTokens> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .set('x-clinic-slug', clinicSlug)
    .send({ email, password });

  return {
    accessToken: res.body.data.tokens.accessToken,
    refreshToken: res.body.data.tokens.refreshToken,
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
