import { Module } from '@nestjs/common';
import { TreatmentController } from './treatment.controller';
import { TreatmentService } from './treatment.service';
import { TreatmentRepository } from './treatment.repository';

@Module({
  controllers: [TreatmentController],
  providers: [TreatmentService, TreatmentRepository],
  exports: [TreatmentRepository],
})
export class TreatmentModule {}
