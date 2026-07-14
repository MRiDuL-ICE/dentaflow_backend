import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GroqService } from '@common/ai/groq.service';
import { ClsService } from 'nestjs-cls';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { BaseRepository } from '@common/repository/base.repository';
import { READ_POOL, WRITE_POOL } from '@database/database.module';
import { Pool } from 'pg';

@Injectable()
export class AiRecommendationsService extends BaseRepository {
  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
    private readonly groq: GroqService,
  ) {
    super(cls, writePool, readPool);
  }

  async getRecommendations(patientId: string, userId: string) {
    // Get current odontogram
    const teeth = await this.query<Record<string, unknown>>(
      `SELECT tooth_number, status, pocket_depth,
              mobility, furcation, bleeding, notes
       FROM odontogram_current
       WHERE patient_id = $1
       ORDER BY tooth_number`,
      [patientId],
    );

    if (!teeth.length) throw new NotFoundException(`No odontogram data for patient: ${patientId}`);

    // Get patient medical history
    const patients = await this.query<{
      medical_history: Record<string, unknown>;
    }>(`SELECT medical_history FROM patients WHERE id = $1`, [patientId]);

    const medicalHistory = patients[0]?.medical_history ?? {};

    // Build context for AI
    const odontogramSummary = teeth
      .map((t) => {
        const bleeding = (t['bleeding'] as boolean[])?.some((b) => b);
        const pocketDepth = t['pocket_depth'] as number[];
        const maxPocket = pocketDepth ? Math.max(...pocketDepth) : 0;

        return (
          `Tooth ${t['tooth_number'] as number}: ${t['status'] as string}` +
          (maxPocket > 3 ? `, pocket depth ${maxPocket}mm` : '') +
          (t['mobility'] ? `, mobility grade ${t['mobility'] as number}` : '') +
          (t['furcation'] ? `, furcation class ${t['furcation'] as number}` : '') +
          (bleeding ? ', bleeding on probing' : '') +
          (t['notes'] ? `, notes: ${t['notes'] as string}` : '')
        );
      })
      .join('\n');

    const allergies = (medicalHistory['allergies'] as string[])?.join(', ') ?? 'None reported';

    const prompt = `Patient Odontogram Summary:
${odontogramSummary}

Patient Medical History:
- Allergies: ${allergies}
- Conditions: ${((medicalHistory['conditions'] as string[]) ?? []).join(', ') || 'None'}
- Medications: ${((medicalHistory['medications'] as string[]) ?? []).join(', ') || 'None'}

Based on this dental chart, provide:
1. Immediate priority treatments (urgent/emergency)
2. Short-term treatments (within 1 month)
3. Long-term treatments (elective/preventive)
4. Overall oral health assessment

Format each recommendation as:
- Tooth/Area: [tooth number or area]
- Treatment: [recommended procedure]
- Priority: [immediate/short-term/long-term]
- Rationale: [brief clinical reasoning]`;

    const response = await this.groq.complete(this.groq.getTreatmentRecommendationPrompt(), prompt);

    return {
      patientId,
      recommendations: response.content,
      teethAnalyzed: teeth.length,
      tokens: response.tokens,
      disclaimer: 'AI-assisted recommendations require dentist review before implementation.',
      generatedAt: new Date().toISOString(),
    };
  }
}
