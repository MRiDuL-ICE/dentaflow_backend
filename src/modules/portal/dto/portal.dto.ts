import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';

export class BookAppointmentDto {
  @ApiProperty()
  @IsUUID()
  dentistId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  chairId?: string;

  @ApiProperty({ example: 'General Checkup' })
  @IsString()
  treatmentType!: string;

  @ApiProperty({ example: '2026-07-01T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PortalQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
