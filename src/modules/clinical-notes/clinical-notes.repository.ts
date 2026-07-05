import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { SaveNoteDto } from './dto/clinical-notes.dto';

@Injectable()
export class ClinicalNotesRepository extends BaseRepository {
  constructor(cls: ClsService<TenantClsStore>) {
    super(cls);
  }

  async save(patientId: string, dentistId: string, dto: SaveNoteDto) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO clinical_notes
         (patient_id, appointment_id, dentist_id,
          ai_generated, final_note, note_type, is_ai_assisted)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        patientId,
        dto.appointmentId ?? null,
        dentistId,
        dto.aiGenerated ?? null,
        dto.finalNote,
        dto.noteType,
        dto.isAiAssisted ?? false,
      ],
    );
    return rows[0];
  }

  async findByPatient(patientId: string) {
    return this.query(
      `SELECT cn.*,
              a.scheduled_at AS appointment_date,
              a.treatment_type
       FROM clinical_notes cn
       LEFT JOIN appointments a ON a.id = cn.appointment_id
       WHERE cn.patient_id = $1
       ORDER BY cn.created_at DESC`,
      [patientId],
    );
  }

  async findById(id: string) {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT id, patient_id, appointment_id, dentist_id, ai_generated, final_note, note_type, is_ai_assisted, created_at FROM clinical_notes WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async update(id: string, finalNote: string) {
    const rows = await this.execute<Record<string, unknown>>(
      `UPDATE clinical_notes
       SET final_note = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [finalNote, id],
    );
    return rows[0] ?? null;
  }
}
