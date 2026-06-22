import { Injectable } from '@nestjs/common';
import { SuperAdminService } from '@modules/super-admin/super-admin.service';

@Injectable()
export class ClinicService {
  constructor(private readonly superAdminService: SuperAdminService) {}

  async selfRegister(data: {
    clinicName: string;
    slug: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    return this.superAdminService.createClinic({
      clinicName: data.clinicName,
      slug: data.slug,
      ownerEmail: data.email,
      ownerFirstName: data.firstName,
      ownerLastName: data.lastName,
      ownerPassword: data.password,
    });
  }
}
