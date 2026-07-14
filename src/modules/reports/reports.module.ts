import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { BillingModule } from '@modules/billing/billing.module';
import { PatientModule } from '@modules/patient/patient.module';
import { AnalyticsRepository } from '@modules/analytics/analytics.repository';

@Module({
  imports: [AnalyticsModule, BillingModule, PatientModule],
  controllers: [ReportsController],
  providers: [ReportsService, AnalyticsRepository],
})
export class ReportsModule {}
