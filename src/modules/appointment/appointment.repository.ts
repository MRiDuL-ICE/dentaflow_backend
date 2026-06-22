import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';

@Injectable()
export class AppointmentRepository extends BaseRepository {
  constructor(cls: ClsService<TenantClsStore>) {
    super(cls);
  }

  async create(dto: CreateAppointmentDto, createdBy: string) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO appointments
         (patient_id, dentist_id, chair_id, treatment_type,
          duration_minutes, scheduled_at, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        dto.patientId,
        dto.dentistId,
        dto.chairId ?? null,
        dto.treatmentType,
        dto.durationMinutes,
        dto.scheduledAt,
        dto.notes ?? null,
        createdBy,
      ],
    );

    // Record initial status in history
    await this.execute(
      `INSERT INTO appointment_status_history
         (appointment_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, 'scheduled', $2)`,
      [rows[0]['id'], createdBy],
    );

    return rows[0];
  }

  async findById(id: string) {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT a.*,
              json_agg(
                json_build_object(
                  'fromStatus',    ash.from_status,
                  'toStatus',      ash.to_status,
                  'reason',        ash.reason,
                  'rescheduledTo', ash.rescheduled_to,
                  'changedAt',     ash.changed_at
                ) ORDER BY ash.changed_at
              ) AS status_history
       FROM appointments a
       LEFT JOIN appointment_status_history ash ON ash.appointment_id = a.id
       WHERE a.id = $1
       GROUP BY a.id`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findAll(query: AppointmentQueryDto) {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    let idx = 1;

    if (query.patientId) {
      conditions.push(`a.patient_id = $${idx++}`);
      values.push(query.patientId);
    }
    if (query.dentistId) {
      conditions.push(`a.dentist_id = $${idx++}`);
      values.push(query.dentistId);
    }
    if (query.status) {
      conditions.push(`a.status = $${idx++}`);
      values.push(query.status);
    }
    if (query.from) {
      conditions.push(`a.scheduled_at >= $${idx++}`);
      values.push(query.from);
    }
    if (query.to) {
      conditions.push(`a.scheduled_at <= $${idx++}`);
      values.push(query.to);
    }

    const limit = query.limit ?? 20;
    const offset = ((query.page ?? 1) - 1) * limit;
    const where = conditions.join(' AND ');

    const [rows, countRows] = await Promise.all([
      this.query<Record<string, unknown>>(
        `SELECT a.*, c.name AS chair_name
         FROM appointments a
         LEFT JOIN chairs c ON c.id = a.chair_id
         WHERE ${where}
         ORDER BY a.scheduled_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      this.query<{ count: string }>(`SELECT COUNT(*) FROM appointments a WHERE ${where}`, values),
    ]);

    return {
      appointments: rows,
      total: parseInt(countRows[0].count, 10),
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    userId: string,
    fromStatus: string,
  ) {
    const rows = await this.execute<Record<string, unknown>>(
      `UPDATE appointments
       SET status       = $1,
           scheduled_at = COALESCE($2, scheduled_at),
           updated_at   = now()
       WHERE id = $3
       RETURNING *`,
      [dto.status, dto.rescheduledTo ?? null, id],
    );

    await this.execute(
      `INSERT INTO appointment_status_history
         (appointment_id, from_status, to_status, reason,
          rescheduled_to, changed_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, fromStatus, dto.status, dto.reason ?? null, dto.rescheduledTo ?? null, userId],
    );

    return rows[0] ?? null;
  }

  async getChairs() {
    return this.query(`SELECT * FROM chairs WHERE is_active = true ORDER BY name`, []);
  }

  async checkConflict(
    dentistId: string,
    scheduledAt: string,
    durationMinutes: number,
    excludeId?: string,
  ): Promise<boolean> {
    const endTime = `($1::timestamptz + ($2 || ' minutes')::interval)`;
    const rows = await this.query<{ count: string }>(
      `SELECT COUNT(*) FROM appointments
       WHERE dentist_id = $3
         AND status NOT IN ('cancelled','no_show')
         AND scheduled_at < ${endTime}
         AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $1
         ${excludeId ? 'AND id != $4' : ''}`,
      excludeId
        ? [scheduledAt, durationMinutes, dentistId, excludeId]
        : [scheduledAt, durationMinutes, dentistId],
    );
    return parseInt(rows[0].count, 10) > 0;
  }
}
