import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { UpdateToothDto } from './dto/update-tooth.dto';
import { READ_POOL, WRITE_POOL } from '@database/database.module';
import { CreateSnapshotDto } from './dto/snapshot.dto';

@Injectable()
export class OdontogramRepository extends BaseRepository {
  constructor(
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
    cls: ClsService<TenantClsStore>,
  ) {
    super(writePool, readPool, cls);
  }

  async getCurrentOdontogram(patientId: string) {
    return this.query(
      `SELECT * FROM odontogram_current
       WHERE patient_id = $1
       ORDER BY tooth_number`,
      [patientId],
    );
  }

  async upsertTooth(
    patientId: string,
    dto: UpdateToothDto,
    updatedBy: string,
    client?: PoolClient,
  ): Promise<void> {
    const sql = `
      INSERT INTO odontogram_current
        (patient_id, tooth_number, status, pocket_depth,
         mobility, furcation, bleeding, notes, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (patient_id, tooth_number)
      DO UPDATE SET
        status       = COALESCE(EXCLUDED.status,       odontogram_current.status),
        pocket_depth = COALESCE(EXCLUDED.pocket_depth, odontogram_current.pocket_depth),
        mobility     = COALESCE(EXCLUDED.mobility,     odontogram_current.mobility),
        furcation    = COALESCE(EXCLUDED.furcation,    odontogram_current.furcation),
        bleeding     = COALESCE(EXCLUDED.bleeding,     odontogram_current.bleeding),
        notes        = COALESCE(EXCLUDED.notes,        odontogram_current.notes),
        updated_by   = EXCLUDED.updated_by,
        updated_at   = now()
    `;

    const params = [
      patientId,
      dto.toothNumber,
      dto.status ?? null,
      dto.pocketDepth ?? null,
      dto.mobility ?? null,
      dto.furcation ?? null,
      dto.bleeding ?? null,
      dto.notes ?? null,
      updatedBy,
    ];

    if (client) {
      await client.query(sql, params);
    } else {
      await this.execute(sql, params);
    }
  }

  async createSnapshot(
    patientId: string,
    appointmentId: string | null,
    teeth: UpdateToothDto[],
    recordedBy: string,
    client: PoolClient,
  ): Promise<void> {
    for (const tooth of teeth) {
      await client.query(
        `INSERT INTO odontogram_snapshots
           (patient_id, appointment_id, tooth_number, status,
            pocket_depth, mobility, furcation, bleeding, notes, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          patientId,
          appointmentId ?? null,
          tooth.toothNumber,
          tooth.status ?? 'healthy',
          tooth.pocketDepth ?? null,
          tooth.mobility ?? null,
          tooth.furcation ?? null,
          tooth.bleeding ?? null,
          tooth.notes ?? null,
          recordedBy,
        ],
      );
    }
  }

  async getSnapshots(patientId: string, appointmentId?: string) {
    const conditions = ['patient_id = $1'];
    const values: unknown[] = [patientId];

    if (appointmentId) {
      conditions.push(`appointment_id = $2`);
      values.push(appointmentId);
    }

    return this.query(
      `SELECT * FROM odontogram_snapshots
       WHERE ${conditions.join(' AND ')}
       ORDER BY recorded_at DESC`,
      values,
    );
  }

  async createSnapshotWithTeeth(
    patientId: string,
    dto: CreateSnapshotDto,
    userId: string,
  ): Promise<void> {
    await this.transaction(async (client) => {
      for (const tooth of dto.teeth) {
        await this.upsertTooth(patientId, tooth, userId, client);
      }
      await this.createSnapshot(patientId, dto.appointmentId ?? null, dto.teeth, userId, client);
    });
  }
}
