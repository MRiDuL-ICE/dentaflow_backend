import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { ClsService } from 'nestjs-cls';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { ROLE_IDS } from '@common/rbac/role-ids.constant';
import { Pool } from 'pg';
import { READ_POOL } from '@database/database.module';
import { EmailService } from '@common/email/email.service';

const ROLE_MAP: Record<string, number> = {
  dentist:      ROLE_IDS.DENTIST,
  receptionist: ROLE_IDS.RECEPTIONIST,
};

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepo:    StaffRepository,
    private readonly cls:          ClsService<TenantClsStore>,
    private readonly emailService: EmailService,
    @Inject(READ_POOL) private readonly readPool: Pool,
  ) {}

  async getAll() {
    const clinicId = this.cls.get('clinicId');
    return this.staffRepo.findAll(clinicId);
  }

  async getDentists() {
    const clinicId = this.cls.get('clinicId');
    return this.staffRepo.findByRole(clinicId, ROLE_IDS.DENTIST);
  }

  async invite(email: string, role: 'dentist' | 'receptionist') {
    const clinicId = this.cls.get('clinicId');

    // Find user
    const user = await this.staffRepo.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException(
        'No active user found with that email. Ask them to register first.',
      );
    }

    // Add to clinic
    const roleId = ROLE_MAP[role];
    await this.staffRepo.addMember(clinicId, user.id, roleId);

    // Fetch clinic name for the email
    const { rows } = await this.readPool.query<{ name: string; slug: string }>(
      `SELECT name, slug FROM public.clinics WHERE id = $1`,
      [clinicId],
    );
    const clinic = rows[0];

    // Send notification — fire and forget, don't block the response
    if (clinic) {
      this.emailService
        .sendStaffAdded(
          user.email,
          user.first_name,
          clinic.name,
          role,
          clinic.slug,
        )
        .catch(() => { /* already logged inside EmailService */ });
    }

    return { message: `${email} added as ${role}` };
  }
}
