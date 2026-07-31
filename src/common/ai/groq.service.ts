import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { GroqMessage, GroqResponse } from './groq.interface';

@Injectable()
export class GroqService {
  private readonly client: Groq;
  private readonly logger = new Logger(GroqService.name);
  private readonly model = 'llama-3.1-8b-instant';

  constructor(private readonly config: ConfigService) {
    this.client = new Groq({
      apiKey: this.config.get<string>('GROQ_API_KEY'),
    });
  }

  async chat(messages: GroqMessage[]): Promise<GroqResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content ?? '';
      const tokens = completion.usage?.total_tokens ?? 0;

      return { content, tokens };
    } catch (err) {
      this.logger.error('Groq API error:', err);
      throw err;
    }
  }

  async complete(systemPrompt: string, userMessage: string): Promise<GroqResponse> {
    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  }

  // Dental assistant system prompt
  getDentalAssistantPrompt(): string {
    return `You are DentaFlow AI, a helpful dental health assistant.
You provide general dental health information and guidance.
You are NOT a replacement for professional dental care.
Always recommend consulting a dentist for diagnosis and treatment.
Keep responses concise, friendly, and accurate.
Never diagnose conditions or prescribe medications.
If asked about emergencies, advise the patient to seek immediate care.`;
  }

  // Clinical notes system prompt
  getClinicalNotesPrompt(): string {
    return `You are a dental clinical notes assistant.
Generate professional, concise clinical notes based on the provided information.
Use standard dental terminology.
Structure notes clearly: Chief Complaint, Examination Findings, Diagnosis, Treatment Performed, Plan.
Be factual and objective. Do not add information not provided.
Format in plain text, no markdown.`;
  }

  // Treatment recommendation system prompt
  getTreatmentRecommendationPrompt(): string {
    return `You are a dental treatment planning assistant.
Based on the odontogram data provided, suggest appropriate treatments.
Prioritize by urgency: emergency > pain relief > infection > function > aesthetics.
Consider tooth relationships and overall oral health.
Provide brief rationale for each recommendation.
Always note this is AI-assisted and requires dentist review.`;
  }
}
