import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { WRITE_POOL, READ_POOL } from '@database/database.module';
import { ClinicMemberRecord, UserRecord } from './types/auth.type';

@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);
  constructor(
    @Inject(WRITE_POOL) private readonly writePool: Pool,
    @Inject(READ_POOL) private readonly readPool: Pool,
  ) {}

  async findClinicsByEmail(email: string) {
    return this.readPool.query(
      `SELECT c.name, c.slug
     FROM public.users u
     JOIN public.clinic_members cm ON cm.user_id = u.id
     JOIN public.clinics c ON c.id = cm.clinic_id
     WHERE u.email = $1
       AND c.id != '00000000-0000-0000-0000-000000000000'
       AND cm.is_active = true`,
      [email],
    );
  }

  // ── Users ──────────────────────────────────────────────

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const { rows } = await this.readPool.query<{
      id: string;
      email: string;
      password_hash: string | null;
      first_name: string;
      last_name: string;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, password_hash, first_name, last_name,
              is_active, created_at
       FROM public.users
       WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (!rows[0]) {
      this.logger.debug(`User with email ${email} not found`);
      return null;
    }

    return {
      id: rows[0].id,
      email: rows[0].email,
      passwordHash: rows[0].password_hash,
      firstName: rows[0].first_name,
      lastName: rows[0].last_name,
      isActive: rows[0].is_active,
      createdAt: rows[0].created_at,
    };
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const { rows } = await this.readPool.query<{
      id: string;
      email: string;
      password_hash: string | null;
      first_name: string;
      last_name: string;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, password_hash, first_name, last_name,
              is_active, created_at
       FROM public.users
       WHERE id = $1 LIMIT 1`,
      [id],
    );

    if (!rows[0]) {
      this.logger.debug(`User with id ${id} not found`);
      return null;
    }

    return {
      id: rows[0].id,
      email: rows[0].email,
      passwordHash: rows[0].password_hash,
      firstName: rows[0].first_name,
      lastName: rows[0].last_name,
      isActive: rows[0].is_active,
      createdAt: rows[0].created_at,
    };
  }

  async createUser(data: {
    email: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
  }): Promise<UserRecord> {
    const { rows } = await this.writePool.query<{
      id: string;
      email: string;
      password_hash: string | null;
      first_name: string;
      last_name: string;
      is_active: boolean;
      created_at: Date;
    }>(
      `INSERT INTO public.users
         (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, password_hash, first_name,
                 last_name, is_active, created_at`,
      [data.email, data.passwordHash, data.firstName, data.lastName],
    );

    return {
      id: rows[0].id,
      email: rows[0].email,
      passwordHash: rows[0].password_hash,
      firstName: rows[0].first_name,
      lastName: rows[0].last_name,
      isActive: rows[0].is_active,
      createdAt: rows[0].created_at,
    };
  }

  // ── Clinic Members ─────────────────────────────────────

  async addClinicMember(data: { userId: string; clinicId: string; roleId: number }): Promise<void> {
    await this.writePool.query(
      `INSERT INTO public.clinic_members (user_id, clinic_id, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, clinic_id, role_id) DO UPDATE SET is_active = true`,
      [data.userId, data.clinicId, data.roleId],
    );
  }

  async getUserClinicRoles(userId: string, clinicId: string): Promise<ClinicMemberRecord[]> {
    const { rows } = await this.readPool.query<{
      user_id: string;
      clinic_id: string;
      role_id: number;
      role_name: string;
    }>(
      `SELECT cm.user_id, cm.clinic_id, cm.role_id, r.name AS role_name
       FROM public.clinic_members cm
       JOIN public.roles r ON r.id = cm.role_id
       WHERE cm.user_id = $1
         AND cm.clinic_id = $2
         AND cm.is_active = true`,
      [userId, clinicId],
    );

    return rows.map((r) => ({
      userId: r.user_id,
      clinicId: r.clinic_id,
      roleId: r.role_id,
      roleName: r.role_name,
    }));
  }

  // ── Refresh Tokens ─────────────────────────────────────

  async saveRefreshToken(data: { userId: string; token: string; expiresAt: Date }): Promise<void> {
    await this.writePool.query(
      `INSERT INTO public.refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [data.userId, data.token, data.expiresAt],
    );
  }

  async findRefreshToken(token: string): Promise<{
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null> {
    const { rows } = await this.readPool.query<{
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `SELECT user_id, expires_at, revoked_at
       FROM public.refresh_tokens
       WHERE token = $1 LIMIT 1`,
      [token],
    );

    if (!rows[0]) {
      this.logger.debug(`Refresh token ${token} not found`);
      return null;
    }

    return {
      userId: rows[0].user_id,
      expiresAt: rows[0].expires_at,
      revokedAt: rows[0].revoked_at,
    };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.writePool.query(
      `UPDATE public.refresh_tokens
       SET revoked_at = now()
       WHERE token = $1`,
      [token],
    );
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.writePool.query(
      `UPDATE public.refresh_tokens
       SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  // ── Magic Links ────────────────────────────────────────

  async saveMagicLink(data: {
    userId: string | null;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.writePool.query(
      `INSERT INTO public.magic_links (user_id, email, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [data.userId, data.email, data.token, data.expiresAt],
    );
  }

  async findMagicLink(token: string): Promise<{
    userId: string | null;
    email: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null> {
    const { rows } = await this.readPool.query<{
      user_id: string | null;
      email: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT user_id, email, expires_at, used_at
       FROM public.magic_links
       WHERE token = $1 LIMIT 1`,
      [token],
    );

    if (!rows[0]) {
      this.logger.debug(`Magic link ${token} not found`);
      return null;
    }

    return {
      userId: rows[0].user_id,
      email: rows[0].email,
      expiresAt: rows[0].expires_at,
      usedAt: rows[0].used_at,
    };
  }

  async markMagicLinkUsed(token: string): Promise<void> {
    await this.writePool.query(
      `UPDATE public.magic_links
       SET used_at = now()
       WHERE token = $1`,
      [token],
    );
  }
}
