import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { READ_POOL } from '@database/database.module';

@Injectable()
export class StaffRepository {
  constructor(
    @Inject(READ_POOL) private readonly readPool: Pool,
  ) {}

  async findAll(clinicId: string) {
    const { rows } = await this.readPool.query(
      `SELECT
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         r.name  AS role,
         r.id    AS role_id,
         cm.is_active,
         cm.joined_at
       FROM public.clinic_members cm
       JOIN public.users u ON u.id  = cm.user_id
       JOIN public.roles r ON r.id  = cm.role_id
       WHERE cm.clinic_id = $1
         AND cm.is_active  = true
         AND r.name       != 'patient'
         AND cm.clinic_id != '00000000-0000-0000-0000-000000000000'
       ORDER BY r.id, u.first_name`,
      [clinicId],
    );
    return rows;
  }

  async findByRole(clinicId: string, roleId: number) {
    const { rows } = await this.readPool.query(
      `SELECT
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         r.name AS role
       FROM public.clinic_members cm
       JOIN public.users u ON u.id = cm.user_id
       JOIN public.roles r ON r.id = cm.role_id
       WHERE cm.clinic_id = $1
         AND cm.role_id   = $2
         AND cm.is_active = true
       ORDER BY u.first_name`,
      [clinicId, roleId],
    );
    return rows;
  }
}
