import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { AuthModule } from '@modules/auth/auth.module';
import { AuthRepository } from '@modules/auth/auth.repository';

@Module({
  imports: [AuthModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, AuthRepository],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
