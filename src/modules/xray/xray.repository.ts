import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';

@Injectable()
export class XrayRepository extends BaseRepository {
  constructor(cls: ClsService<TenantClsStore>) {
    super(cls);
  }

  async create(data: {
    patientId: string;
    appointmentId?: string;
    imageUrl: string;
    imagePath: string;
    analyzedBy: string;
  }) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO xray_analyses
         (patient_id, appointment_id, image_url,
          image_path, status, analyzed_by)
       VALUES ($1,$2,$3,$4,'pending',$5)
       RETURNING *`,
      [data.patientId, data.appointmentId ?? null, data.imageUrl, data.imagePath, data.analyzedBy],
    );
    return rows[0];
  }

  async updateAnalysis(
    id: string,
    result: {
      findings: Record<string, unknown>;
      summary: string;
      confidence: number;
      modelUsed: string;
    },
  ) {
    const rows = await this.execute<Record<string, unknown>>(
      `UPDATE xray_analyses
       SET findings      = $1,
           summary       = $2,
           confidence    = $3,
           model_used    = $4,
           status        = 'completed',
           updated_at    = now()
       WHERE id = $5
       RETURNING *`,
      [JSON.stringify(result.findings), result.summary, result.confidence, result.modelUsed, id],
    );
    return rows[0] ?? null;
  }

  async markFailed(id: string, error: string) {
    await this.execute(
      `UPDATE xray_analyses
       SET status        = 'failed',
           error_message = $1,
           updated_at    = now()
       WHERE id = $2`,
      [error, id],
    );
  }

  async findByPatient(patientId: string) {
    return this.query(
      `SELECT id, patient_id, appointment_id, image_url, image_path, findings, summary, confidence, model_used, status, error_message, analyzed_by, created_at FROM xray_analyses
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId],
    );
  }

  async findById(id: string) {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT id, patient_id, appointment_id, image_url, image_path, findings, summary, confidence, model_used, status, error_message, analyzed_by, created_at FROM xray_analyses WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }
}
