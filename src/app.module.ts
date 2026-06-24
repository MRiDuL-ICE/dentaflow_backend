import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
    }),

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
    AuditModule,
    PatientModule,
    OdontogramModule,
    AppointmentModule,
    TreatmentModule,
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
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
