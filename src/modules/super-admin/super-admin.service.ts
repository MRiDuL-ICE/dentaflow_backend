import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { WRITE_POOL, READ_POOL, REDIS_CLIENT } from '@database/database.module';
import { AuthRepository } from '@modules/auth/auth.repository';
import { ROLE_IDS } from '@common/rbac/role-ids.constant';
import { runTenantMigrations } from '@common/migrations/migration-runner';
import Redis from 'ioredis';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @Inject(WRITE_POOL) private readonly writePool: Pool,
    @Inject(READ_POOL) private readonly readPool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user?.isActive || !user.passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    // Verify user has super_admin role
    const { rows } = await this.readPool.query<{ role_id: number }>(
      `SELECT role_id FROM public.clinic_members
       WHERE user_id = $1 AND role_id = $2`,
      [user.id, ROLE_IDS.SUPER_ADMIN],
    );

    if (!rows[0]) throw new UnauthorizedException('Not a super admin');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        roles: ['super_admin'],
        clinicId: null,
      },
      { expiresIn: '1h' },
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.authRepo.saveRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    await this.redis.set(`refresh:${refreshToken}`, user.id, 'EX', 30 * 24 * 60 * 60);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: ['super_admin'],
        clinicId: null,
      },
      tokens: { accessToken, refreshToken, expiresIn: 3600 },
    };
  }

  async createClinic(data: {
    clinicName: string;
    slug: string;
    ownerEmail: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerPassword: string;
  }) {
    // Check slug uniqueness
    const { rows: existing } = await this.readPool.query(
      `SELECT id FROM public.clinics WHERE slug = $1`,
      [data.slug],
    );
    if (existing[0]) throw new ConflictException('Clinic slug already taken');

    const schemaName = `clinic_${Date.now()}`;
    const passwordHash = await bcrypt.hash(data.ownerPassword, 12);
    const databaseUrl = this.config.get<string>('db.url')!;

    const client = await this.writePool.connect();
    try {
      await client.query('BEGIN');

      // Create clinic
      const { rows: clinicRows } = await client.query<{ id: string }>(
        `INSERT INTO public.clinics (name, slug, schema_name)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [data.clinicName, data.slug, schemaName],
      );
      const clinicId = clinicRows[0].id;

      // Create or find owner user
      let user = await this.authRepo.findUserByEmail(data.ownerEmail);
      if (!user) {
        user = await this.authRepo.createUser({
          email: data.ownerEmail,
          passwordHash,
          firstName: data.ownerFirstName,
          lastName: data.ownerLastName,
        });
      }

      // Assign clinic_owner role
      await client.query(
        `INSERT INTO public.clinic_members (user_id, clinic_id, role_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [user.id, clinicId, ROLE_IDS.CLINIC_OWNER],
      );

      await client.query('COMMIT');

      // Provision tenant schema + run migrations
      await client.query(`SELECT public.create_tenant_schema($1)`, [schemaName]);

      this.logger.log(`DB URL for migrations: ${databaseUrl}`);
      await runTenantMigrations(schemaName, databaseUrl);

      this.logger.log(`Clinic created: ${data.slug} (${schemaName})`);

      return {
        clinicId,
        clinicName: data.clinicName,
        slug: data.slug,
        schemaName,
        owner: {
          id: user.id,
          email: user.email,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
