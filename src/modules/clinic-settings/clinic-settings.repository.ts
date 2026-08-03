import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { Pool } from 'pg';
import { READ_POOL, WRITE_POOL } from '@database/database.module';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto';

@Injectable()
export class ClinicSettingsRepository extends BaseRepository {
  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL)  readPool:  Pool,
  ) {
    super(cls, writePool, readPool);
  }

  async get() {
    const rows = await this.query(`SELECT * FROM clinic_settings LIMIT 1`, []);
    return rows[0] ?? null;
  }

  async update(dto: UpdateClinicSettingsDto) {
    const map: Record<string, unknown> = {
      notify_email:                   dto.notifyEmail,
      notify_sms:                     dto.notifySms,
      notify_appointment_reminder:    dto.notifyAppointmentReminder,
      notify_appointment_confirm:     dto.notifyAppointmentConfirm,
      notify_billing:                 dto.notifyBilling,
      appearance_theme:               dto.appearanceTheme,
      appearance_language:            dto.appearanceLanguage,
      appt_default_duration:          dto.apptDefaultDuration,
      appt_slot_interval:             dto.apptSlotInterval,
      appt_start_time:                dto.apptStartTime,
      appt_end_time:                  dto.apptEndTime,
    };

    // Only set columns that were actually passed
    const entries = Object.entries(map).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.get();

    const setClauses = entries.map(([col], i) => `${col} = $${i + 1}`).join(', ');
    const values     = entries.map(([, v]) => v);

    const rows = await this.execute<Record<string, unknown>>(
      `UPDATE clinic_settings SET ${setClauses}, updated_at = now() RETURNING *`,
      values,
    );
    return rows[0];
  }
}
