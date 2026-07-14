import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { WRITE_POOL, REDIS_CLIENT } from '@database/database.module';
import { HealthResponse, ServiceHealth } from './health.interface';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(WRITE_POOL)   private readonly pool:  Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Full health check with latency' })
  async check(): Promise<HealthResponse> {
    const [dbResult, redisResult] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const database: ServiceHealth = dbResult.status === 'fulfilled'
      ? { status: 'connected', latency: dbResult.value }
      : { status: 'error' };

    const redis: ServiceHealth = redisResult.status === 'fulfilled'
      ? { status: 'connected', latency: redisResult.value }
      : { status: 'error' };

    const allHealthy = database.status === 'connected'
                    && redis.status    === 'connected';

    return {
      status:    allHealthy ? 'ok' : 'degraded',
      version:   process.env.npm_package_version ?? '1.0.0',
      uptime:    Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services:  { database, redis },
    };
  }

  @Get('ping')
  @Public()
  @ApiOperation({ summary: 'Lightweight ping — no DB check' })
  ping() {
    return { pong: true, timestamp: new Date().toISOString() };
  }

  private async checkDatabase(): Promise<number> {
    const start = Date.now();
    await this.pool.query('SELECT 1');
    return Date.now() - start;
  }

  private async checkRedis(): Promise<number> {
    const start = Date.now();
    await this.redis.ping();
    return Date.now() - start;
  }
}
