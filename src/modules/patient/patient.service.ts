import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PatientRepository } from './patient.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';
import { AuditService } from '@common/audit/audit.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CacheService } from '@common/cache/cache.service';

@Injectable()
export class PatientService {
  constructor(
    private readonly patientRepo: PatientRepository,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
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

    console.log("patients----------------",patients);    

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
}
