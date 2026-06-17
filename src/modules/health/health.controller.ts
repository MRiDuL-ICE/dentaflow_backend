import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { WRITE_POOL, REDIS_CLIENT } from '@database/database.module';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(WRITE_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'DB + Redis connectivity check' })
  async check() {
    const [dbOk, redisOk] = await Promise.all([
      this.pool
        .query('SELECT 1')
        .then(() => true)
        .catch(() => false),
      this.redis
        .ping()
        .then((r) => r === 'PONG')
        .catch(() => false),
    ]);

    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      database: dbOk ? 'connected' : 'error',
      redis: redisOk ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    };
  }
}
