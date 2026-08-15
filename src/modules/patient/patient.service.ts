import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PatientRepository } from './patient.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';
import { AuditService } from '@common/audit/audit.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CacheService } from '@common/cache/cache.service';
import { AuthRepository } from '@modules/auth/auth.repository';
import { EmailService } from '@common/email/email.service';
import { ClsService } from 'nestjs-cls';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { Pool } from 'pg';
import { WRITE_POOL } from '@database/database.module';
import { ROLE_IDS } from '@common/rbac/role-ids.constant';

@Injectable()
export class PatientService {
  constructor(
    private readonly patientRepo: PatientRepository,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    private readonly authRepo: AuthRepository,
    private readonly emailService: EmailService,
    private readonly cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) private readonly writePool: Pool,
  ) {}

  async create(dto: CreatePatientDto, userId: string) {
    // Check duplicate email within clinic
    if (dto.email && (await this.patientRepo.existsByEmail(dto.email))) {
      throw new ConflictException(`Patient with email ${dto.email} already exists`);
    }

    const patient = await this.patientRepo.createWithRelations(dto, userId);

    await this.audit.log({
      userId,
      action: 'create',
      resource: 'patient',
      resourceId: patient.id,
    });

    return patient;
  }

  async findAll(query: PatientQueryDto) {
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const offset = (page - 1) * limit;

    const { patients, total } = await this.patientRepo.findAll({
      search: query.search,
      limit,
      offset,
    });

    //console.log("patients----------------",patients);

    return {
      data: patients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const cacheKey = this.cache.patientKey(id);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const patient = await this.patientRepo.get360(id);
    if (!patient['id']) throw new NotFoundException(`Patient not found: ${id}`);

    await this.cache.set(cacheKey, patient, this.cache.TTL.PATIENT);
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, userId: string) {
    const existing = await this.patientRepo.findById(id);
    if (!existing) throw new NotFoundException(`Patient not found: ${id}`);

    const updated = await this.patientRepo.updateWithRelations(id, dto);

    await this.audit.log({
      userId,
      action: 'update',
      resource: 'patient',
      resourceId: id,
    });

    await this.cache.del(this.cache.patientKey(id));
    return updated;
  }

  async remove(id: string, userId: string) {
    const deleted = await this.patientRepo.softDelete(id, userId);
    if (!deleted) throw new NotFoundException(`Patient not found: ${id}`);

    await this.audit.log({
      userId,
      action: 'delete',
      resource: 'patient',
      resourceId: id,
      meta: { soft: true },
    });

    await this.cache.del(this.cache.patientKey(id));
    return { message: `Patient ${id} deleted` };
  }

  async inviteToPortal(patientId: string) {
    const patient = await this.patientRepo.findById(patientId);
    if (!patient) throw new NotFoundException(`Patient not found: ${patientId}`);
    if (!patient.email) throw new BadRequestException('Patient has no email address on record');

    const clinicId = this.cls.get('clinicId');

    // Get clinic info
    const { rows: clinicRows } = await this.writePool.query<{ name: string; slug: string }>(
      `SELECT name, slug FROM public.clinics WHERE id = $1`,
      [clinicId],
    );
    const clinic = clinicRows[0];
    if (!clinic) throw new NotFoundException('Clinic not found');

    // Check if user already exists
    let user = await this.authRepo.findUserByEmail(patient.email);
    const isNewUser = !user;

    if (!user) {
      // Create user without password — they'll set it on first login
      user = await this.authRepo.createUser({
        email: patient.email,
        passwordHash: null, // no password yet
        firstName: patient.firstName,
        lastName: patient.lastName,
      });
    }

    // Add to clinic_members as patient if not already
    await this.authRepo.addClinicMember({
      userId: user.id,
      clinicId,
      roleId: ROLE_IDS.PATIENT,
    });

    // Get the clinic_member id we just created/found
    const { rows: memberRows } = await this.writePool.query<{ id: string }>(
      `SELECT id FROM public.clinic_members
     WHERE user_id = $1 AND clinic_id = $2 AND role_id = $3`,
      [user.id, clinicId, ROLE_IDS.PATIENT],
    );
    const clinicMemberId = memberRows[0]?.id;

    // Link patient record to clinic_member
    if (clinicMemberId) {
      await this.patientRepo.linkClinicMember(patientId, clinicMemberId);
    }

    // Send invite email — fire and forget
    this.emailService
      .sendPatientPortalInvite(
        patient.email,
        patient.firstName,
        clinic.name,
        clinic.slug,
        isNewUser,
      )
      .catch(() => {});

    return {
      message: `Portal invite sent to ${patient.email}`,
      isNewUser,
    };
  }

  //find patient by email
  async findByEmail(email: string) {
    const patient = await this.patientRepo.findByEmail(email);
    if (!patient) return null;

    return {
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
    };
  }
}
