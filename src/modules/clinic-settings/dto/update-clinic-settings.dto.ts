import { IsBoolean, IsInt, IsOptional, IsString, Min, Max, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClinicSettingsDto {
  // Notifications
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyEmail?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifySms?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyAppointmentReminder?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyAppointmentConfirm?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyBilling?: boolean;

  // Appearance
  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsString()
  appearanceTheme?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional() @IsOptional() @IsString() appearanceLanguage?: string;

  // Appointments
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(240) apptDefaultDuration?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(60) apptSlotInterval?: number;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Must be HH:MM format' })
  apptStartTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Must be HH:MM format' })
  apptEndTime?: string;
}
