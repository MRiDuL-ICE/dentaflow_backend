import { Inject, Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from '@common/repository/base.repository';
import { ClsService } from 'nestjs-cls';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';

import { AuditLogEntry } from './types/audit.types';
import { READ_POOL, WRITE_POOL } from '@database/database.module';
import { Pool } from 'pg';

@Injectable()
export class AuditService extends BaseRepository {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
  ) {
    super(cls, writePool, readPool);
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.execute(
        `INSERT INTO audit_logs
           (user_id, action, resource, resource_id, meta)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          entry.userId,
          entry.action,
          entry.resource,
          entry.resourceId ?? null,
          entry.meta ? JSON.stringify(entry.meta) : null,
        ],
      );
    } catch (err) {
      // Audit failure must never break the main flow
      this.logger.warn(`Audit log failed: ${(err as Error).message}`);
    }
  }
}
