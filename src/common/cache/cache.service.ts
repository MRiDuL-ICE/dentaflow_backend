import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@database/database.module';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ── Generic ────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.redis.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = 300): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      this.logger.warn(`Cache set failed: ${key}`, err);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.redis.del(...keys);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length) await this.redis.del(...keys);
  }

  // ── DentaFlow specific cache keys ──────────────────────

  patientKey = (id: string) => `patient:360:${id}`;
  catalogKey = (schema: string) => `catalog:${schema}`;
  appointmentKey = (dentistId: string, date: string) => `appointments:${dentistId}:${date}`;

  // ── TTLs ───────────────────────────────────────────────

  readonly TTL = {
    PATIENT: 300, // 5 min
    CATALOG: 3600, // 1 hour
    APPOINTMENTS: 60, // 1 min
  } as const;
}
