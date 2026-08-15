import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { Pool } from 'pg';
import { READ_POOL, WRITE_POOL } from '@database/database.module';

@Injectable()
export class PortalRepository extends BaseRepository {
  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
  ) {
    super(cls, writePool, readPool);
  }

  // Find patient record linked to this user
  async findPatientByUserId(userId: string, clinicId: string): Promise<{ id: string } | null> {
    const rows = await this.query<{ id: string }>(
      `SELECT p.id
     FROM patients p
     JOIN public.clinic_members cm
       ON cm.id = p.clinic_member_id
     WHERE cm.user_id  = $1
       AND cm.clinic_id = $2
       AND cm.is_active = true
       AND p.is_deleted = false
     LIMIT 1`,
      [userId, clinicId],
    );
    return rows[0] ?? null;
  }

  async getPatientRecord(patientId: string) {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT
         p.id, p.first_name, p.last_name, p.date_of_birth,
         p.gender, p.phone, p.email, p.address,
         p.medical_history, p.created_at,
         pi.provider       AS insurance_provider,
         pi.policy_number  AS insurance_policy,
         pi.valid_until    AS insurance_valid_until
       FROM patients p
       LEFT JOIN patient_insurance pi ON pi.patient_id = p.id
       WHERE p.id = $1 AND p.is_deleted = false`,
      [patientId],
    );
    return rows[0] ?? null;
  }

  async getClinicById(clinicId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT id, name, slug FROM public.clinics WHERE id = $1`,
      [clinicId],
    );
    return rows[0] ?? null;
  }

  async getAppointments(patientId: string, limit: number, offset: number) {
    const [rows, countRows] = await Promise.all([
      this.query<Record<string, unknown>>(
        `SELECT
           a.id, a.treatment_type, a.scheduled_at,
           a.duration_minutes, a.status, a.notes,
           c.name AS chair_name
         FROM appointments a
         LEFT JOIN chairs c ON c.id = a.chair_id
         WHERE a.patient_id = $1
         ORDER BY a.scheduled_at DESC
         LIMIT $2 OFFSET $3`,
        [patientId, limit, offset],
      ),
      this.query<{ count: string }>(`SELECT COUNT(*) FROM appointments WHERE patient_id = $1`, [
        patientId,
      ]),
    ]);

    return {
      appointments: rows,
      total: parseInt(countRows[0].count, 10),
    };
  }

  async getXrays(patientId: string) {
    return this.query(
      `SELECT id, image_url, summary, findings,
              status, created_at
       FROM xray_analyses
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId],
    );
  }

  async getClinicalNotes(patientId: string) {
    return this.query(
      `SELECT cn.id, cn.note_type, cn.final_note,
              cn.created_at, a.scheduled_at AS appointment_date,
              a.treatment_type
       FROM clinical_notes cn
       LEFT JOIN appointments a ON a.id = cn.appointment_id
       WHERE cn.patient_id = $1
       ORDER BY cn.created_at DESC`,
      [patientId],
    );
  }

  async getInvoices(patientId: string) {
    return this.query(
      `SELECT
         i.id, i.invoice_number, i.status,
         i.total, i.amount_paid, i.balance,
         i.due_date, i.created_at,
         COUNT(p.id)::int AS payment_count
       FROM invoices i
       LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.patient_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [patientId],
    );
  }

  async getTreatmentPlans(patientId: string) {
    return this.query(
      `SELECT
         tp.id, tp.title, tp.status, tp.notes,
         tp.created_at,
         COUNT(tpi.id)::int    AS item_count,
         SUM(tpi.total_cost)   AS total_cost,
         SUM(CASE WHEN tpi.status = 'completed'
             THEN tpi.total_cost ELSE 0 END) AS completed_cost
       FROM treatment_plans tp
       LEFT JOIN treatment_plan_items tpi ON tpi.plan_id = tp.id
       WHERE tp.patient_id = $1
       GROUP BY tp.id
       ORDER BY tp.created_at DESC`,
      [patientId],
    );
  }

  async getReminders(patientId: string) {
    return this.query(
      `SELECT pr.*, a.scheduled_at AS appointment_date,
              a.treatment_type
       FROM patient_reminders pr
       LEFT JOIN appointments a ON a.id = pr.appointment_id
       WHERE pr.patient_id = $1
       ORDER BY pr.scheduled_at DESC
       LIMIT 20`,
      [patientId],
    );
  }

  async createReminder(data: {
    patientId: string;
    appointmentId?: string;
    type: string;
    scheduledAt: string;
  }) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO patient_reminders
         (patient_id, appointment_id, type, scheduled_at)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [data.patientId, data.appointmentId ?? null, data.type, data.scheduledAt],
    );
    return rows[0];
  }
}
