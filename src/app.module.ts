import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { DatabaseModule } from '@database/database.module';
import { TenantMiddleware } from '@common/tenant/tenant.middleware';
import { TenantService } from '@common/tenant/tenant.service';
import appConfig from '@config/app.config';
import databaseConfig from '@config/db.config';
import redisConfig from '@config/redis.config';
import jwtConfig from '@config/jwt.config';
import { RolesGuard } from './common/rbac/roles.guard';
import { HealthModule } from './modules/health/health.module';
import { EmailModule } from '@common/email/email.module';
import { AuthModule } from '@modules/auth/auth.module';
import { SuperAdminModule } from '@modules/super-admin/super-admin.module';
import { ClinicModule } from '@modules/clinic/clinic.module';
import { AuditModule } from '@common/audit/audit.module';
import { PatientModule } from '@modules/patient/patient.module';
import { OdontogramModule } from '@modules/odontogram/odontogram.module';
import { AppointmentModule } from '@modules/appointment/appointment.module';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { TreatmentModule } from '@modules/treatment/treatment.module';
import { BillingModule } from '@modules/billing/billing.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { AiModule } from '@common/ai/ai.module';
import { CacheModule } from '@common/cache/cache.module';
import { RabbitMQModule } from '@common/rabbitmq/rabbitmq.module';
import { QueueModule } from '@common/queue/queue.module';
import { AiChatModule } from '@modules/ai-chat/ai-chat.module';
import { ClinicalNotesModule } from '@modules/clinical-notes/clinical-notes.module';
import { AiRecommendationsModule } from '@modules/ai-recommendations/ai-recommendations.module';
import { XrayModule } from '@modules/xray/xray.module';
import { PortalModule } from '@modules/portal/portal.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { HttpLoggerMiddleware } from '@common/logger/http-logger.middleware';
import { envValidationSchema } from '@config/env.validation';
import { LoggerModule } from '@common/logger/logger.module';
import { StaffModule } from '@modules/staff/staff.module';
import { ClinicSettingsModule } from '@modules/clinic-settings/clinic-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    LoggerModule,

    // nestjs-cls — global, auto-applies to all Fastify routes
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true, // auto-mount on all routes
        generateId: true, // gives each request a unique cls.id
      },
    }),

    DatabaseModule,
    HealthModule,
    EmailModule,
    AuthModule,
    SuperAdminModule,
    ClinicModule,
    StaffModule,
    AuditModule,
    PatientModule,
    OdontogramModule,
    AppointmentModule,
    TreatmentModule,
    BillingModule,
    InventoryModule,
    AiModule,
    CacheModule,
    RabbitMQModule,
    QueueModule,
    AiChatModule,
    ClinicalNotesModule,
    AiRecommendationsModule,
    XrayModule,
    PortalModule,
    AnalyticsModule,
    ReportsModule,
    ClinicSettingsModule,
  ],
  providers: [
    TenantService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'super-admin/login', method: RequestMethod.POST },
        { path: 'clinics/register', method: RequestMethod.POST },
        { path: 'auth/magic-link/verify', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
