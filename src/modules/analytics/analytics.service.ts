import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';
import { GroqService } from '@common/ai/groq.service';
import { CacheService } from '@common/cache/cache.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly groq: GroqService,
    private readonly cache: CacheService,
  ) {}

  async getSummaryKpis() {
    const cacheKey = `analytics:kpis`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.analyticsRepo.getSummaryKpis();
    await this.cache.set(cacheKey, data, 300); // 5 min
    return data;
  }

  async getRevenueDaily(days?: number) {
    const cacheKey = `analytics:revenue:daily:${days ?? 30}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.analyticsRepo.getRevenueDaily(days);
    await this.cache.set(cacheKey, data, 300);
    return data;
  }

  async getRevenueWeekly(weeks?: number) {
    return this.analyticsRepo.getRevenueWeekly(weeks);
  }

  async getRevenueByMethod() {
    return this.analyticsRepo.getRevenueByPaymentMethod();
  }

  async getAppointmentStats(days?: number) {
    const cacheKey = `analytics:appointments:${days ?? 30}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.analyticsRepo.getAppointmentStats(days);
    await this.cache.set(cacheKey, data, 60);
    return data;
  }

  async getAppointmentsByDentist() {
    return this.analyticsRepo.getAppointmentsByDentist();
  }

  async getNoShowRate() {
    return this.analyticsRepo.getNoShowRate();
  }

  async getPatientGrowth(weeks?: number) {
    return this.analyticsRepo.getPatientGrowth(weeks);
  }

  async getPatientDemographics() {
    return this.analyticsRepo.getPatientDemographics();
  }

  async getRecallPatients() {
    const cacheKey = `analytics:recall`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.analyticsRepo.getRecallPatients();
    await this.cache.set(cacheKey, data, 3600);
    return data;
  }

  async getTreatmentBreakdown() {
    return this.analyticsRepo.getTreatmentBreakdown();
  }

  async getTreatmentPlanCompletion() {
    return this.analyticsRepo.getTreatmentPlanCompletion();
  }

  async getInventoryTurnover() {
    return this.analyticsRepo.getInventoryTurnover();
  }

  async getInventorySummary() {
    return this.analyticsRepo.getInventorySummary();
  }

  async getAiInsights() {
    const cacheKey = `analytics:ai_insights`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const rawData = await this.analyticsRepo.getAiInsightsData();

    const prompt = `Based on this dental clinic data for the last 90 days:

Top Treatments: ${JSON.stringify(rawData.topTreatments)}
Peak Hours: ${JSON.stringify(rawData.peakHours)}
No-Show Rates by Day: ${JSON.stringify(rawData.noShows)}

Provide 3-5 actionable business insights for the clinic owner.
Format each insight as:
- Insight: [what the data shows]
- Action: [specific recommended action]

Be concise and practical.`;

    const response = await this.groq.complete(
      `You are a dental practice analytics advisor.
       Analyze clinic performance data and provide actionable insights.
       Be specific, data-driven, and practical.`,
      prompt,
    );

    const result = {
      rawData,
      insights: response.content,
      generatedAt: new Date().toISOString(),
    };

    await this.cache.set(cacheKey, result, 3600); // 1 hour
    return result;
  }

  async getFullDashboard() {
    const [
      kpis,
      revenueDaily,
      appointmentStats,
      patientGrowth,
      treatmentBreakdown,
      inventorySummary,
    ] = await Promise.all([
      this.getSummaryKpis(),
      this.getRevenueDaily(30),
      this.getAppointmentStats(30),
      this.getPatientGrowth(12),
      this.getTreatmentBreakdown(),
      this.getInventorySummary(),
    ]);

    return {
      kpis,
      charts: {
        revenueDaily,
        appointmentStats,
        patientGrowth,
        treatmentBreakdown,
      },
      inventory: inventorySummary,
    };
  }
}
