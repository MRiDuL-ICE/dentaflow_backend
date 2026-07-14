import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';

@ApiTags('analytics')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Roles('clinic_owner', 'dentist')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Full dashboard — all KPIs in one call' })
  getDashboard() {
    return this.analyticsService.getFullDashboard();
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Summary KPIs (revenue, appointments, patients)' })
  getKpis() {
    return this.analyticsService.getSummaryKpis();
  }

  @Get('revenue/daily')
  @ApiOperation({ summary: 'Daily revenue for last N days' })
  getRevenueDaily(@Query('days') days?: number) {
    return this.analyticsService.getRevenueDaily(days);
  }

  @Get('revenue/weekly')
  @ApiOperation({ summary: 'Weekly revenue for last N weeks' })
  getRevenueWeekly(@Query('weeks') weeks?: number) {
    return this.analyticsService.getRevenueWeekly(weeks);
  }

  @Get('revenue/by-method')
  @ApiOperation({ summary: 'Revenue breakdown by payment method' })
  getRevenueByMethod() {
    return this.analyticsService.getRevenueByMethod();
  }

  @Get('appointments/stats')
  @ApiOperation({ summary: 'Daily appointment stats' })
  getAppointmentStats(@Query('days') days?: number) {
    return this.analyticsService.getAppointmentStats(days);
  }

  @Get('appointments/by-dentist')
  @ApiOperation({ summary: 'Appointments and completion rate by dentist' })
  getByDentist() {
    return this.analyticsService.getAppointmentsByDentist();
  }

  @Get('appointments/no-show-rate')
  @ApiOperation({ summary: 'No-show rate for last 30 days' })
  getNoShowRate() {
    return this.analyticsService.getNoShowRate();
  }

  @Get('patients/growth')
  @ApiOperation({ summary: 'Weekly patient growth' })
  getPatientGrowth(@Query('weeks') weeks?: number) {
    return this.analyticsService.getPatientGrowth(weeks);
  }

  @Get('patients/demographics')
  @ApiOperation({ summary: 'Patient demographics by gender and age' })
  getDemographics() {
    return this.analyticsService.getPatientDemographics();
  }

  @Get('patients/recall')
  @ApiOperation({ summary: 'Patients due for recall (no visit in 6+ months)' })
  getRecall() {
    return this.analyticsService.getRecallPatients();
  }

  @Get('treatments/breakdown')
  @ApiOperation({ summary: 'Treatment type breakdown' })
  getTreatmentBreakdown() {
    return this.analyticsService.getTreatmentBreakdown();
  }

  @Get('treatments/plan-completion')
  @ApiOperation({ summary: 'Treatment plan completion rates' })
  getPlanCompletion() {
    return this.analyticsService.getTreatmentPlanCompletion();
  }

  @Get('inventory/turnover')
  @ApiOperation({ summary: 'Inventory turnover and stock status' })
  getInventoryTurnover() {
    return this.analyticsService.getInventoryTurnover();
  }

  @Get('inventory/summary')
  @ApiOperation({ summary: 'Inventory summary KPIs' })
  getInventorySummary() {
    return this.analyticsService.getInventorySummary();
  }

  @Get('ai-insights')
  @Roles('clinic_owner')
  @ApiOperation({ summary: 'AI-powered clinic performance insights' })
  getAiInsights() {
    return this.analyticsService.getAiInsights();
  }
}
