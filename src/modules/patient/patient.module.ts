import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PatientRepository } from './patient.repository';
import { AuditModule } from '@common/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PatientController],
  providers: [PatientService, PatientRepository],
  exports: [PatientRepository],
})
export class PatientModule {}
