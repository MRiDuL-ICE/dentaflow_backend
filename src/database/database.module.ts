import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as ws from 'ws';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = (ws as any).WebSocket as typeof WebSocket;
}

export const WRITE_POOL = Symbol('WRITE_POOL');
export const READ_POOL = Symbol('READ_POOL');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: { rejectUnauthorized: false },
  });
}

@Global()
@Module({
  providers: [
    {
      provide: WRITE_POOL,
      useFactory: (c: ConfigService) => createPool(c.get<string>('db.url')!),
      inject: [ConfigService],
    },
    {
      provide: READ_POOL,
      useFactory: (c: ConfigService) => createPool(c.get<string>('db.url')!),
      inject: [ConfigService],
    },
    {
      provide: REDIS_CLIENT,
      useFactory: (c: ConfigService) =>
        new Redis({
          host: c.get<string>('redis.host'),
          port: c.get<number>('redis.port'),
        }),
      inject: [ConfigService],
    },
    {
      provide: SUPABASE_CLIENT,
      useFactory: (c: ConfigService): SupabaseClient =>
        createClient(c.get<string>('SUPABASE_URL')!, c.get<string>('SUPABASE_SERVICE_ROLE_KEY')!, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }) as SupabaseClient,
      inject: [ConfigService],
    },
  ],
  exports: [WRITE_POOL, READ_POOL, REDIS_CLIENT, SUPABASE_CLIENT],
})
export class DatabaseModule { }
