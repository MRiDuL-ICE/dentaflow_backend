import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PatientRepository } from './patient.repository';
import { AuditModule } from '@common/audit/audit.module';
import { AuthModule } from '@modules/auth/auth.module';
import { EmailModule } from '@common/email/email.module';

@Module({
  imports: [AuditModule, AuthModule, EmailModule],
  controllers: [PatientController],
  providers: [PatientService, PatientRepository],
  exports: [PatientService, PatientRepository],
})
export class PatientModule {}
