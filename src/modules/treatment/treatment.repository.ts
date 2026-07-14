import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import {
  CreateTreatmentDto,
  CreateTreatmentPlanDto,
  CreatePlanItemDto,
} from './dto/create-treatment.dto';
import { TreatmentPlanRow } from './types/treatment.types';
import { Pool } from 'pg';
import { READ_POOL, WRITE_POOL } from '@database/database.module';

@Injectable()
export class TreatmentRepository extends BaseRepository {
  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
  ) {
    super(cls, writePool, readPool);
  }

  // ── Catalog ────────────────────────────────────────────

  async getCategories() {
    return this.query(
      `SELECT id, name, color, is_active, created_at FROM treatment_categories
       WHERE is_active = true ORDER BY name`,
      [],
    );
  }

  async createTreatment(dto: CreateTreatmentDto) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO treatments
         (category_id, name, description, base_cost,
          duration_minutes, tooth_applicable)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        dto.categoryId ?? null,
        dto.name,
        dto.description ?? null,
        dto.baseCost,
        dto.durationMinutes ?? 30,
        dto.toothApplicable ?? true,
      ],
    );
    return rows[0];
  }

  async findTreatments(search?: string) {
    const conditions = ['t.is_active = true'];
    const values: unknown[] = [];

    if (search) {
      conditions.push(`to_tsvector('english', t.name) @@ plainto_tsquery('english', $1)`);
      values.push(search);
    }

    return this.query(
      `SELECT t.*, tc.name AS category_name
       FROM treatments t
       LEFT JOIN treatment_categories tc ON tc.id = t.category_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY tc.name, t.name`,
      values,
    );
  }

  // ── Plans ──────────────────────────────────────────────

  async createPlan(dto: CreateTreatmentPlanDto, createdBy: string) {
    // Deactivate existing active plan for patient
    await this.execute(
      `UPDATE treatment_plans
       SET is_active = false, updated_at = now()
       WHERE patient_id = $1 AND is_active = true`,
      [dto.patientId],
    );

    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO treatment_plans
         (patient_id, title, notes, status, is_active, created_by)
       VALUES ($1,$2,$3,'draft',true,$4)
       RETURNING *`,
      [dto.patientId, dto.title, dto.notes ?? null, createdBy],
    );
    return rows[0];
  }

  async findPlansByPatient(patientId: string) {
    return this.query(
      `SELECT tp.*,
              COUNT(tpi.id)::int              AS item_count,
              SUM(tpi.total_cost)             AS total_cost,
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

  async findPlanById(id: string) {
    const [plan, items] = await Promise.all([
      this.query<TreatmentPlanRow>(
        `SELECT id, patient_id, title, notes, status, is_active, created_at, created_by FROM treatment_plans WHERE id = $1`,
        [id],
      ),
      this.query<Record<string, unknown>>(
        `SELECT tpi.*, t.name AS treatment_name,
                tc.name AS category_name
         FROM treatment_plan_items tpi
         LEFT JOIN treatments t  ON t.id  = tpi.treatment_id
         LEFT JOIN treatment_categories tc ON tc.id = t.category_id
         WHERE tpi.plan_id = $1
         ORDER BY tpi.sort_order, tpi.created_at`,
        [id],
      ),
    ]);

    if (!plan[0]) return null;
    return { ...plan[0], items };
  }

  async addPlanItem(planId: string, dto: CreatePlanItemDto) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO treatment_plan_items
         (plan_id, treatment_id, name, tooth_numbers, region,
          quantity, unit_cost, discount, notes,
          materials_used, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        planId,
        dto.treatmentId ?? null,
        dto.name,
        dto.toothNumbers ?? null,
        dto.region ?? null,
        dto.quantity ?? 1,
        dto.unitCost,
        dto.discount ?? 0,
        dto.notes ?? null,
        JSON.stringify(dto.materialsUsed ?? []),
        dto.sortOrder ?? 0,
      ],
    );
    return rows[0];
  }

  async updatePlanItemStatus(itemId: string, status: string) {
    const rows = await this.execute<Record<string, unknown>>(
      `UPDATE treatment_plan_items
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, itemId],
    );
    return rows[0] ?? null;
  }

  async updatePlanStatus(id: string, status: string) {
    const rows = await this.execute<Record<string, unknown>>(
      `UPDATE treatment_plans
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );
    return rows[0] ?? null;
  }

  async deletePlanItem(itemId: string): Promise<boolean> {
    const rows = await this.execute<{ id: string }>(
      `DELETE FROM treatment_plan_items
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [itemId],
    );
    return rows.length > 0;
  }
}
