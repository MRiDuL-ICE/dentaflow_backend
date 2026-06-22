import { Inject } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ClsService } from 'nestjs-cls';
import { WRITE_POOL, READ_POOL } from '@database/database.module';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';

export abstract class BaseRepository {
  @Inject(WRITE_POOL) private readonly writePool!: Pool;
  @Inject(READ_POOL) private readonly readPool!: Pool;

  constructor(protected readonly cls: ClsService<TenantClsStore>) {}

  private get schema(): string {
    const schema = this.cls.get('schemaName');
    if (!schema) throw new Error('No tenant schema in CLS — TenantMiddleware not applied?');
    return schema;
  }

  protected async query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const client = await this.readPool.connect();
    try {
      await client.query(`SET search_path TO "${this.schema}", public`);
      const { rows } = await client.query<T>(sql, params);
      return rows;
    } finally {
      client.release();
    }
  }

  protected async execute<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const client = await this.writePool.connect();
    try {
      await client.query(`SET search_path TO "${this.schema}", public`);
      const { rows } = await client.query<T>(sql, params);
      return rows;
    } finally {
      client.release();
    }
  }

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
