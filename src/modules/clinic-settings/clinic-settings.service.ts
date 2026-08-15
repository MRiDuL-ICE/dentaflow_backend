import { Injectable } from '@nestjs/common';
import { ClinicSettingsRepository } from './clinic-settings.repository';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto';

@Injectable()
export class ClinicSettingsService {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  get() {
    return this.repo.get();
  }
  update(dto: UpdateClinicSettingsDto) {
    return this.repo.update(dto);
  }
}
