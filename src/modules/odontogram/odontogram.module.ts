import { Module } from '@nestjs/common';
import { OdontogramController } from './odontogram.controller';
import { OdontogramService } from './odontogram.service';
import { OdontogramRepository } from './odontogram.repository';
import { PatientModule } from '@modules/patient/patient.module';

@Module({
  imports: [PatientModule],
  controllers: [OdontogramController],
  providers: [OdontogramService, OdontogramRepository],
})
export class OdontogramModule {}
