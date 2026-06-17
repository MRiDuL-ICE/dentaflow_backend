import { Inject } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ClsService } from 'nestjs-cls';
import { WRITE_POOL, READ_POOL } from '@database/database.module';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';

export abstract class BaseRepository {
  constructor(
    @Inject(WRITE_POOL) private readonly writePool: Pool,
    @Inject(READ_POOL) private readonly readPool: Pool,
    private readonly cls: ClsService<TenantClsStore>,
  ) {}

  private get schema(): string {
    const schema = this.cls.get('schemaName');
    if (!schema) {
      throw new Error('No tenant schema in CLS — TenantMiddleware not applied?');
    }
    return schema;
  }

  private searchPath(): string {
    return `SET search_path TO "${this.schema}", public;`;
  }

  /** SELECT → read pool */
  protected async query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const { rows } = await this.readPool.query<T>(`${this.searchPath()} ${sql}`, params);
    return rows;
  }

  /** INSERT / UPDATE / DELETE → write pool */
  protected async execute<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const { rows } = await this.writePool.query<T>(`${this.searchPath()} ${sql}`, params);
    return rows;
  }

  /** Multi-step atomic operations */
  protected async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.writePool.connect();
    try {
      await client.query(`SET search_path TO "${this.schema}", public`);
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
