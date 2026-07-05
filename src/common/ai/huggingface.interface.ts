export interface ImageAnalysisResult {
  summary: string;
  findings: Record<string, unknown>;
  confidence: number;
  modelUsed: string;
}
