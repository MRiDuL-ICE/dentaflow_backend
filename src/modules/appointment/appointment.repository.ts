import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { Pool } from 'pg';
import { READ_POOL, WRITE_POOL } from '@database/database.module';

@Injectable()
export class AppointmentRepository extends BaseRepository {
  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
  ) {
    super(cls, writePool, readPool);
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
      `SELECT
       a.*,
       c.name          AS chair_name,
       p.first_name    AS patient_first_name,
       p.last_name     AS patient_last_name,
       p.email         AS patient_email,
       p.phone         AS patient_phone,
       du.first_name   AS dentist_first_name,
       du.last_name    AS dentist_last_name,
       du.email        AS dentist_email,
       json_agg(
         json_build_object(
           'fromStatus',    ash.from_status,
           'toStatus',      ash.to_status,
           'reason',        ash.reason,
           'rescheduledTo', ash.rescheduled_to,
           'changedAt',     ash.changed_at
         ) ORDER BY ash.changed_at
       ) FILTER (WHERE ash.id IS NOT NULL) AS status_history
     FROM appointments a
     LEFT JOIN chairs c
       ON c.id = a.chair_id
     LEFT JOIN patients p
       ON p.id = a.patient_id
     LEFT JOIN public.clinic_members dcm
       ON dcm.user_id = a.dentist_id
       AND dcm.is_active = true
     LEFT JOIN public.users du
       ON du.id = dcm.user_id
     LEFT JOIN appointment_status_history ash
       ON ash.appointment_id = a.id
     WHERE a.id = $1
     GROUP BY
       a.id,
       c.name,
       p.first_name, p.last_name, p.email, p.phone,
       du.first_name, du.last_name, du.email`,
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
  if (query.chairId) {
    conditions.push(`a.chair_id = $${idx++}`);
    values.push(query.chairId);
  }
  if (query.treatmentType) {
    conditions.push(`a.treatment_type ILIKE $${idx++}`);
    values.push(`%${query.treatmentType}%`);
  }
  if (query.from) {
    conditions.push(`a.scheduled_at >= $${idx++}`);
    values.push(query.from);
  }
  if (query.to) {
    conditions.push(`a.scheduled_at <= $${idx++}`);
    values.push(query.to);
  }

  // Full-text search across patient name, dentist name, emails, treatment
  if (query.search) {
    conditions.push(`(
      p.first_name  ILIKE $${idx}   OR
      p.last_name   ILIKE $${idx}   OR
      p.email       ILIKE $${idx}   OR
      du.first_name ILIKE $${idx}   OR
      du.last_name  ILIKE $${idx}   OR
      du.email      ILIKE $${idx}   OR
      a.treatment_type ILIKE $${idx}
    )`);
    values.push(`%${query.search}%`);
    idx++;
  }

  const SORT_COL_MAP: Record<string, string> = {
    patient_name:   'p.first_name',
    dentist_name:   'du.first_name',
    patient_email:  'p.email',
    dentist_email:  'du.email',
    status:         'a.status',
    scheduled_at:   'a.scheduled_at',
  };
  const sortCol   = SORT_COL_MAP[query.sortBy ?? 'scheduled_at'] ?? 'a.scheduled_at';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const limit  = query.limit ?? 20;
  const offset = ((query.page ?? 1) - 1) * limit;
  const where  = conditions.join(' AND ');

  const baseQuery = `
    FROM appointments a
    LEFT JOIN chairs c
      ON c.id = a.chair_id
    LEFT JOIN patients p
      ON p.id = a.patient_id
    LEFT JOIN public.clinic_members dcm
      ON dcm.user_id = a.dentist_id AND dcm.is_active = true
    LEFT JOIN public.users du
      ON du.id = dcm.user_id
    WHERE ${where}
  `;

  const [rows, countRows] = await Promise.all([
    this.query<Record<string, unknown>>(
      `SELECT
         a.*,
         c.name        AS chair_name,
         p.first_name  AS patient_first_name,
         p.last_name   AS patient_last_name,
         p.email       AS patient_email,
         p.phone       AS patient_phone,
         du.first_name AS dentist_first_name,
         du.last_name  AS dentist_last_name,
         du.email      AS dentist_email
       ${baseQuery}
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset],
    ),
    this.query<{ count: string }>(
      `SELECT COUNT(*) ${baseQuery}`,
      values,
    ),
  ]);

  return { appointments: rows, total: parseInt(countRows[0].count, 10) };
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

  async findAppointmentWithPatient(id: string) {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT
       a.*,
       p.email      AS patient_email,
       p.first_name AS patient_first_name,
       p.last_name  AS patient_last_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async getClinicInfo(clinicId: string) {
    // public schema — no search_path
    const { rows } = await this.writePool.query<Record<string, unknown>>(
      `SELECT name, slug FROM public.clinics WHERE id = $1`,
      [clinicId],
    );
    return rows[0] ?? null;
  }
}
