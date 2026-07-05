import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalNotesRepository } from './clinical-notes.repository';
import { GroqService } from '@common/ai/groq.service';
import { AuditService } from '@common/audit/audit.service';
import { GenerateNoteDto, SaveNoteDto } from './dto/clinical-notes.dto';

@Injectable()
export class ClinicalNotesService {
  constructor(
    private readonly notesRepo: ClinicalNotesRepository,
    private readonly groq: GroqService,
    private readonly audit: AuditService,
  ) {}

  async generateNote(patientId: string, dto: GenerateNoteDto, userId: string) {
    const prompt = `Generate a clinical note for the following dental visit:

Note Type: ${dto.noteType ?? 'general'}
Context: ${dto.context}

Format the note professionally with these sections where applicable:
- Chief Complaint
- Clinical Findings
- Diagnosis
- Treatment Performed
- Treatment Plan / Next Steps
- Patient Instructions`;

    const response = await this.groq.complete(this.groq.getClinicalNotesPrompt(), prompt);

    return {
      aiGenerated: response.content,
      tokens: response.tokens,
      noteType: dto.noteType,
    };
  }

  async saveNote(patientId: string, dentistId: string, dto: SaveNoteDto) {
    const note = await this.notesRepo.save(patientId, dentistId, dto);

    await this.audit.log({
      userId: dentistId,
      action: 'create',
      resource: 'clinical_note',
      resourceId: note['id'] as string,
      meta: { isAiAssisted: dto.isAiAssisted },
    });

    return note;
  }

  async getPatientNotes(patientId: string) {
    return this.notesRepo.findByPatient(patientId);
  }

  async getNote(id: string) {
    const note = await this.notesRepo.findById(id);
    if (!note) throw new NotFoundException(`Note not found: ${id}`);
    return note;
  }

  async updateNote(id: string, finalNote: string, userId: string) {
    const note = await this.notesRepo.update(id, finalNote);
    if (!note) throw new NotFoundException(`Note not found: ${id}`);

    await this.audit.log({
      userId,
      action: 'update',
      resource: 'clinical_note',
      resourceId: id,
    });

    return note;
  }
}
