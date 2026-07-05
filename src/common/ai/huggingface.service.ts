import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceClient } from '@huggingface/inference';
import { ImageAnalysisResult } from './huggingface.interface';

@Injectable()
export class HuggingFaceService {
  private readonly client: InferenceClient;
  private readonly logger = new Logger(HuggingFaceService.name);
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.client = new InferenceClient(this.config.get<string>('HUGGINGFACE_API_KEY'));
    this.model =
      this.config.get<string>('HUGGINGFACE_MODEL') ?? 'Salesforce/blip-image-captioning-large';
  }

  async analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      // Fetch image as blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Image captioning / analysis
      const result = await this.client.imageToText({
        model: this.model,
        data: blob,
      });

      const caption = result.generated_text ?? '';

      // Parse findings from caption
      const findings = this.parseDentalFindings(caption);

      return {
        summary: caption,
        findings,
        confidence: 0.75, // HF doesn't return confidence for all models
        modelUsed: this.model,
      };
    } catch (err) {
      this.logger.error('HuggingFace analysis error:', err);
      throw err;
    }
  }

  async analyzeImageBuffer(buffer: Buffer, mimeType: string): Promise<ImageAnalysisResult> {
    try {
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });

      const result = await this.client.imageToText({
        model: this.model,
        data: blob,
      });

      const caption = result.generated_text ?? '';
      const findings = this.parseDentalFindings(caption);

      return {
        summary: caption,
        findings,
        confidence: 0.75,
        modelUsed: this.model,
      };
    } catch (err) {
      this.logger.error('HuggingFace buffer analysis error:', err);
      throw err;
    }
  }

  private parseDentalFindings(caption: string): Record<string, unknown> {
    // Extract dental-relevant keywords from caption
    const lower = caption.toLowerCase();

    return {
      rawCaption: caption,
      possibleCavity:
        lower.includes('dark') || lower.includes('decay') || lower.includes('carious'),
      possibleFracture:
        lower.includes('fracture') || lower.includes('crack') || lower.includes('broken'),
      boneLevel: lower.includes('bone') ? 'mentioned' : 'not_mentioned',
      rootVisible: lower.includes('root'),
      metalRestoration:
        lower.includes('metal') || lower.includes('amalgam') || lower.includes('crown'),
    };
  }
}
