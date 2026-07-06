import { Module } from '@nestjs/common';
import { ClinicalNotesController } from './clinical-notes.controller';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalNotesRepository } from './clinical-notes.repository';

@Module({
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService, ClinicalNotesRepository],
})
export class ClinicalNotesModule {}
