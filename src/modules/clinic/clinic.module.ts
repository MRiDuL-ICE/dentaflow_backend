import { Module } from '@nestjs/common';
import { ClinicController }  from './clinic.controller';
import { ClinicService }     from './clinic.service';
import { SuperAdminModule }  from '@modules/super-admin/super-admin.module';

@Module({
  imports:     [SuperAdminModule],
  controllers: [ClinicController],
  providers:   [ClinicService],
  exports:     [ClinicService],
})
export class ClinicModule {}
