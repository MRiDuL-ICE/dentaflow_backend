import { Module } from '@nestjs/common';
import { ClinicSettingsController } from './clinic-settings.controller';
import { ClinicSettingsService }    from './clinic-settings.service';
import { ClinicSettingsRepository } from './clinic-settings.repository';

@Module({
  controllers: [ClinicSettingsController],
  providers:   [ClinicSettingsService, ClinicSettingsRepository],
  exports:     [ClinicSettingsService],
})
export class ClinicSettingsModule {}
