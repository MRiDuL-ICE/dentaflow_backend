import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { WRITE_POOL, REDIS_CLIENT } from '@database/database.module';
import { ClinicRow, TenantRecord } from './tenant.interface';

const localTenantCache = new Map<string, TenantRecord>();

@Injectable()
export class TenantService {
  constructor(
    @Inject(WRITE_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async resolve(slug: string): Promise<TenantRecord | null> {
    const key = slug.trim().toLowerCase();

    const local = localTenantCache.get(key);
    if (local) return local;

    const cacheKey = `tenant:slug:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as TenantRecord;
      localTenantCache.set(key, parsed);
      return parsed;
    }

    const { rows } = await this.pool.query<ClinicRow>(
      `SELECT id, schema_name
       FROM public.clinics
       WHERE slug = $1 AND is_active = true
       LIMIT 1`,
      [key],
    );

    if (!rows[0]) return null;

    const record = { id: rows[0].id, schemaName: rows[0].schema_name };
    localTenantCache.set(key, record);
    await this.redis.set(cacheKey, JSON.stringify(record), 'EX', 3600);

    return record;
  }

  async invalidate(slug: string): Promise<void> {
    await this.redis.del(`tenant:slug:${slug}`);
  }
}
