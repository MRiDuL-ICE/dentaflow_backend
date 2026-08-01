import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { READ_POOL } from '@database/database.module';

@Injectable()
export class StaffRepository {
  constructor(
    @Inject(READ_POOL) private readonly readPool: Pool,
    @Inject(READ_POOL) private readonly writePool: Pool,
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

  async findUserByEmail(email: string) {
    const { rows } = await this.readPool.query<{ id: string }>(
      `SELECT id FROM public.users WHERE email = $1 AND is_active = true`,
      [email],
    );
    return rows[0] ?? null;
  }

  async addMember(clinicId: string, userId: string, roleId: number) {
    const { rows } = await this.writePool.query<{ id: string }>(
      `INSERT INTO public.clinic_members (user_id, clinic_id, role_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, clinic_id, role_id) DO UPDATE SET is_active = true
     RETURNING id`,
      [userId, clinicId, roleId],
    );
    return rows[0];
  }
}
