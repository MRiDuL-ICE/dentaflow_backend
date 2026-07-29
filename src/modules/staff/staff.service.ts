import { Injectable } from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { ClsService } from 'nestjs-cls';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly cls:       ClsService<TenantClsStore>,
  ) {}

  async getAll() {
    const clinicId = this.cls.get('clinicId');
    return this.staffRepo.findAll(clinicId);
  }

  async getDentists() {
    const clinicId = this.cls.get('clinicId');
    return this.staffRepo.findByRole(clinicId, 3); // role_id 3 = dentist
  }
}
