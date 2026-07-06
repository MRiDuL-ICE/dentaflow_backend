import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { XrayRepository } from './xray.repository';
import { HuggingFaceService } from '@common/ai/huggingface.service';
import { AuditService } from '@common/audit/audit.service';
import { Inject } from '@nestjs/common';
import { SUPABASE_CLIENT } from '@database/database.module';
import { MultipartFile } from '@fastify/multipart';

@Injectable()
export class XrayService {
  private readonly logger = new Logger(XrayService.name);

  constructor(
    private readonly xrayRepo: XrayRepository,
    private readonly hf: HuggingFaceService,
    private readonly audit: AuditService,
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  ) {}

  async uploadAndAnalyze(
    patientId: string,
    file: MultipartFile,
    appointmentId: string | undefined,
    userId: string,
  ) {
    // Read file buffer
    const buffer = await file.toBuffer();
    const fileName = `xrays/${patientId}/${Date.now()}-${file.filename}`;
    const mimeType = file.mimetype;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('xrays')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      this.logger.error('Supabase upload error:', uploadError);
      throw new Error('Failed to upload X-ray image');
    }

    const { data: urlData } = this.supabase.storage.from('xrays').getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;
    const imagePath = fileName;

    // Create DB record
    const xray = await this.xrayRepo.create({
      patientId,
      appointmentId,
      imageUrl,
      imagePath,
      analyzedBy: userId,
    });

    const xrayId = xray['id'] as string;

    // Run AI analysis asynchronously
    void this.runAnalysis(xrayId, buffer, mimeType);

    await this.audit.log({
      userId,
      action: 'upload',
      resource: 'xray',
      resourceId: xrayId,
    });

    return {
      id: xrayId,
      status: 'pending',
      message: 'X-ray uploaded. Analysis running in background.',
      imageUrl,
    };
  }

  private async runAnalysis(xrayId: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      const result = await this.hf.analyzeImageBuffer(buffer, mimeType);

      await this.xrayRepo.updateAnalysis(xrayId, {
        findings: result.findings,
        summary: result.summary,
        confidence: result.confidence,
        modelUsed: result.modelUsed,
      });

      this.logger.log(`X-ray analysis complete: ${xrayId}`);
    } catch (err) {
      this.logger.error(`X-ray analysis failed: ${xrayId}`, err);
      await this.xrayRepo.markFailed(xrayId, (err as Error).message);
    }
  }

  async getPatientXrays(patientId: string) {
    return this.xrayRepo.findByPatient(patientId);
  }

  async getXray(id: string) {
    const xray = await this.xrayRepo.findById(id);
    if (!xray) throw new NotFoundException(`X-ray not found: ${id}`);
    return xray;
  }
}
