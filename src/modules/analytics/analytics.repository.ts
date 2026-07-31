import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { Pool } from 'pg';
import { READ_POOL, WRITE_POOL } from '@database/database.module';

@Injectable()
export class AnalyticsRepository extends BaseRepository {
  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
  ) {
    super(cls, writePool, readPool);
  }

  // ── Revenue ────────────────────────────────────────────

  async getRevenueDaily(days: number = 30) {
    return this.query<Record<string, unknown>>(
      `SELECT
         DATE(p.created_at)        AS date,
         COUNT(DISTINCT i.id)    AS invoice_count,
         SUM(p.amount)           AS revenue,
         COUNT(DISTINCT p.id)    AS payment_count
       FROM invoices i
       JOIN payments p ON p.invoice_id = i.id
       WHERE p.created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY DATE(p.created_at)
       ORDER BY date ASC`,
      [days],
    );
  }

  async getRevenueWeekly(weeks: number = 12) {
    return this.query<Record<string, unknown>>(
      `SELECT
         DATE_TRUNC('week', p.created_at) AS week_start,
         COUNT(DISTINCT i.id)             AS invoice_count,
         SUM(p.amount)                    AS revenue,
         AVG(i.total)                     AS avg_invoice_value
       FROM invoices i
       JOIN payments p ON p.invoice_id = i.id
       WHERE p.created_at >= NOW() - ($1 || ' weeks')::interval
       GROUP BY DATE_TRUNC('week', p.created_at)
       ORDER BY week_start ASC`,
      [weeks],
    );
  }

  async getRevenueByPaymentMethod() {
    return this.query<Record<string, unknown>>(
      `SELECT
         method,
         COUNT(*)::int   AS count,
         SUM(amount)     AS total,
         AVG(amount)     AS average
       FROM payments
       WHERE created_at >= NOW() - '30 days'::interval
       GROUP BY method
       ORDER BY total DESC`,
      [],
    );
  }

  // ── Appointments ───────────────────────────────────────

  async getAppointmentStats(days: number = 30) {
    return this.query<Record<string, unknown>>(
      `SELECT
         DATE(scheduled_at)                        AS date,
         COUNT(*)::int                             AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int   AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int   AS cancelled,
         COUNT(*) FILTER (WHERE status = 'no_show')::int     AS no_show,
         COUNT(*) FILTER (WHERE status = 'scheduled')::int   AS scheduled
       FROM appointments
       WHERE scheduled_at >= NOW() - ($1 || ' days')::interval
       GROUP BY DATE(scheduled_at)
       ORDER BY date ASC`,
      [days],
    );
  }

  async getAppointmentsByDentist() {
    return this.query<Record<string, unknown>>(
      `SELECT
         a.dentist_id,
         COUNT(*)::int                                      AS total,
         COUNT(*) FILTER (WHERE a.status = 'completed')::int AS completed,
         AVG(a.duration_minutes)                            AS avg_duration,
         SUM(CASE WHEN a.status = 'completed'
             THEN 1 ELSE 0 END)::float /
         NULLIF(COUNT(*), 0)                               AS completion_rate
       FROM appointments a
       WHERE a.scheduled_at >= NOW() - '30 days'::interval
       GROUP BY a.dentist_id
       ORDER BY total DESC`,
      [],
    );
  }

  async getNoShowRate() {
    return this.query<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'no_show')::float /
         NULLIF(COUNT(*), 0) * 100  AS no_show_rate,
         COUNT(*)::int              AS total_appointments,
         COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_shows
       FROM appointments
       WHERE scheduled_at >= NOW() - '30 days'::interval`,
      [],
    );
  }

  // ── Patients ───────────────────────────────────────────

  async getPatientGrowth(weeks: number = 12) {
    return this.query<Record<string, unknown>>(
      `SELECT
         DATE_TRUNC('week', created_at) AS week_start,
         COUNT(*)::int                  AS new_patients,
         SUM(COUNT(*)) OVER (
           ORDER BY DATE_TRUNC('week', created_at)
         )::int                         AS cumulative_total
       FROM patients
       WHERE is_deleted = false
         AND created_at >= NOW() - ($1 || ' weeks')::interval
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY week_start ASC`,
      [weeks],
    );
  }

  async getPatientDemographics() {
    return this.query<Record<string, unknown>>(
      `SELECT
         gender,
         COUNT(*)::int                                AS count,
         AVG(
           EXTRACT(YEAR FROM AGE(date_of_birth))
         )::int                                       AS avg_age,
         MIN(date_of_birth)                           AS oldest_dob,
         MAX(date_of_birth)                           AS youngest_dob
       FROM patients
       WHERE is_deleted = false
         AND gender IS NOT NULL
       GROUP BY gender`,
      [],
    );
  }

  async getRecallPatients() {
    return this.query<Record<string, unknown>>(
      `SELECT
         p.id, p.first_name, p.last_name,
         p.email, p.phone,
         MAX(a.scheduled_at) AS last_visit,
         NOW() - MAX(a.scheduled_at) AS time_since_visit
       FROM patients p
       LEFT JOIN appointments a
         ON a.patient_id = p.id
         AND a.status = 'completed'
       WHERE p.is_deleted = false
       GROUP BY p.id
       HAVING MAX(a.scheduled_at) < NOW() - '6 months'::interval
           OR MAX(a.scheduled_at) IS NULL
       ORDER BY last_visit ASC NULLS FIRST
       LIMIT 50`,
      [],
    );
  }

  // ── Treatment ──────────────────────────────────────────

  async getTreatmentBreakdown() {
    return this.query<Record<string, unknown>>(
      `SELECT
         treatment_type,
         COUNT(*)::int   AS count,
         AVG(duration_minutes)::int AS avg_duration
       FROM appointments
       WHERE status = 'completed'
         AND scheduled_at >= NOW() - '30 days'::interval
       GROUP BY treatment_type
       ORDER BY count DESC
       LIMIT 10`,
      [],
    );
  }

  async getTreatmentPlanCompletion() {
    return this.query<Record<string, unknown>>(
      `SELECT
         status,
         COUNT(*)::int  AS count,
         AVG(
           (SELECT COUNT(*) FROM treatment_plan_items
            WHERE plan_id = tp.id
              AND status = 'completed')::float /
           NULLIF(
             (SELECT COUNT(*) FROM treatment_plan_items
              WHERE plan_id = tp.id), 0
           )
         ) * 100         AS avg_completion_pct
       FROM treatment_plans tp
       GROUP BY status`,
      [],
    );
  }

  // ── Inventory ──────────────────────────────────────────

  async getInventoryTurnover() {
    return this.query<Record<string, unknown>>(
      `SELECT
         ii.id, ii.name, ii.category,
         ii.quantity              AS current_stock,
         ii.reorder_level,
         ii.unit_cost,
         ii.quantity * ii.unit_cost AS stock_value,
         COALESCE(
           ABS(SUM(it.quantity) FILTER (
             WHERE it.type IN ('treatment_use','expired')
             AND it.created_at >= NOW() - '30 days'::interval
           )), 0
         )                        AS monthly_usage,
         CASE
           WHEN ii.quantity <= ii.reorder_level THEN 'low'
           WHEN ii.expiry_date <= NOW() + '30 days'::interval THEN 'expiring'
           ELSE 'ok'
         END                      AS stock_status
       FROM inventory_items ii
       LEFT JOIN inventory_transactions it ON it.item_id = ii.id
       WHERE ii.is_active = true
       GROUP BY ii.id
       ORDER BY monthly_usage DESC`,
      [],
    );
  }

  async getInventorySummary() {
    return this.query<Record<string, unknown>>(
      `SELECT
         COUNT(*)::int                                   AS total_items,
         COUNT(*) FILTER (
           WHERE quantity <= reorder_level
         )::int                                          AS low_stock_count,
         COUNT(*) FILTER (
           WHERE expiry_date <= NOW() + '30 days'::interval
         )::int                                          AS expiring_soon,
         SUM(quantity * unit_cost)                       AS total_stock_value
       FROM inventory_items
       WHERE is_active = true`,
      [],
    );
  }

  // ── Summary KPIs ───────────────────────────────────────

  async getSummaryKpis() {
    const [revenue, appointments, patients, overdue] = await Promise.all([
      this.query<Record<string, unknown>>(
        `SELECT
           COALESCE(SUM(amount), 0)           AS total_revenue_30d,
           COALESCE(SUM(amount) FILTER (
             WHERE created_at >= NOW() - '7 days'::interval
           ), 0)                              AS revenue_7d
         FROM payments
         WHERE created_at >= NOW() - '30 days'::interval`,
        [],
      ),
      this.query<Record<string, unknown>>(
        `SELECT
           COUNT(*)::int                                      AS total_30d,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_30d,
           COUNT(*) FILTER (
             WHERE scheduled_at >= NOW()
               AND scheduled_at < NOW() + '7 days'::interval
               AND status IN ('scheduled','confirmed')
           )::int                                            AS upcoming_7d
         FROM appointments
         WHERE scheduled_at >= NOW() - '30 days'::interval
            OR (scheduled_at >= NOW()
                AND scheduled_at < NOW() + '7 days'::interval)`,
        [],
      ),
      this.query<Record<string, unknown>>(
        `SELECT
           COUNT(*)::int                                  AS total_active,
           COUNT(*) FILTER (
             WHERE created_at >= NOW() - '30 days'::interval
           )::int                                        AS new_30d
         FROM patients
         WHERE is_deleted = false`,
        [],
      ),
      this.query<Record<string, unknown>>(
        `SELECT COUNT(*)::int AS overdue_invoices
         FROM invoices
         WHERE status NOT IN ('paid','cancelled')
           AND due_date < CURRENT_DATE`,
        [],
      ),
    ]);

    return {
      revenue: revenue[0],
      appointments: appointments[0],
      patients: patients[0],
      billing: overdue[0],
    };
  }

  // ── AI Insights ────────────────────────────────────────

  async getAiInsightsData() {
    const [topTreatments, peakHours, noShows] = await Promise.all([
      this.query<Record<string, unknown>>(
        `SELECT treatment_type, COUNT(*)::int AS count
         FROM appointments
         WHERE status = 'completed'
           AND scheduled_at >= NOW() - '90 days'::interval
         GROUP BY treatment_type
         ORDER BY count DESC LIMIT 5`,
        [],
      ),
      this.query<Record<string, unknown>>(
        `SELECT
           EXTRACT(HOUR FROM scheduled_at)::int AS hour,
           COUNT(*)::int                        AS count
         FROM appointments
         WHERE scheduled_at >= NOW() - '30 days'::interval
         GROUP BY EXTRACT(HOUR FROM scheduled_at)
         ORDER BY count DESC LIMIT 5`,
        [],
      ),
      this.query<Record<string, unknown>>(
        `SELECT
           EXTRACT(DOW FROM scheduled_at)::int AS day_of_week,
           COUNT(*) FILTER (WHERE status = 'no_show')::float /
           NULLIF(COUNT(*), 0) * 100          AS no_show_rate
         FROM appointments
         WHERE scheduled_at >= NOW() - '90 days'::interval
         GROUP BY EXTRACT(DOW FROM scheduled_at)
         ORDER BY no_show_rate DESC`,
        [],
      ),
    ]);

    return { topTreatments, peakHours, noShows };
  }
}
