import { Injectable, NotFoundException } from '@nestjs/common';
import { OdontogramRepository } from './odontogram.repository';
import { PatientRepository } from '@modules/patient/patient.repository';
import { UpdateToothDto } from './dto/update-tooth.dto';
import { CreateSnapshotDto } from './dto/snapshot.dto';
import { AuditService } from '@common/audit/audit.service';

@Injectable()
export class OdontogramService {
  constructor(
    private readonly odontogramRepo: OdontogramRepository,
    private readonly patientRepo: PatientRepository,
    private readonly audit: AuditService,
  ) {}

  async getCurrent(patientId: string) {
    await this.ensurePatientExists(patientId);
    const teeth = await this.odontogramRepo.getCurrentOdontogram(patientId);
    return { patientId, teeth };
  }

  async updateTooth(patientId: string, dto: UpdateToothDto, userId: string) {
    await this.ensurePatientExists(patientId);
    await this.odontogramRepo.upsertTooth(patientId, dto, userId);

    await this.audit.log({
      userId,
      action: 'update',
      resource: 'odontogram',
      resourceId: patientId,
      meta: { toothNumber: dto.toothNumber },
    });

    return this.odontogramRepo.getCurrentOdontogram(patientId);
  }

  async createSnapshot(patientId: string, dto: CreateSnapshotDto, userId: string) {
    await this.ensurePatientExists(patientId);

    await this.odontogramRepo.createSnapshotWithTeeth(patientId, dto, userId);

    await this.audit.log({
      userId,
      action: 'snapshot',
      resource: 'odontogram',
      resourceId: patientId,
      meta: {
        appointmentId: dto.appointmentId,
        teethCount: dto.teeth.length,
      },
    });

    return { message: 'Odontogram snapshot saved' };
  }

  async getSnapshots(patientId: string, appointmentId?: string) {
    await this.ensurePatientExists(patientId);
    return this.odontogramRepo.getSnapshots(patientId, appointmentId);
  }

  private async ensurePatientExists(patientId: string): Promise<void> {
    const patient = await this.patientRepo.findById(patientId);
    if (!patient) throw new NotFoundException(`Patient not found: ${patientId}`);
  }
}
