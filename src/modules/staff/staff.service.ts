import { Injectable, NotFoundException } from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { ClsService } from 'nestjs-cls';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { ROLE_IDS } from '@common/rbac/role-ids.constant';

const ROLE_MAP: Record<string, number> = {
  dentist: ROLE_IDS.DENTIST,
  receptionist: ROLE_IDS.RECEPTIONIST,
};

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly cls: ClsService<TenantClsStore>,
  ) {}

  async getAll() {
    const clinicId = this.cls.get('clinicId');
    return this.staffRepo.findAll(clinicId);
  }

  async getDentists() {
    const clinicId = this.cls.get('clinicId');
    return this.staffRepo.findByRole(clinicId, 3); // role_id 3 = dentist
  }

  async invite(email: string, role: 'dentist' | 'receptionist') {
    const clinicId = this.cls.get('clinicId');
    const user = await this.staffRepo.findUserByEmail(email);
    if (!user)
      throw new NotFoundException(
        'No active user found with that email. Ask them to register first.',
      );
    const roleId = ROLE_MAP[role];
    await this.staffRepo.addMember(clinicId, user.id, roleId);
    return { message: `${email} added as ${role}` };
  }
}
