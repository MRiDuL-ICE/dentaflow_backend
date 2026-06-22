import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsInt, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty()
  @IsUUID()
  dentistId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  chairId?: string;

  @ApiProperty({ example: 'Cleaning' })
  @IsString()
  @MaxLength(100)
  treatmentType!: string;

  @ApiProperty({ example: 30, description: 'Duration in minutes' })
  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @ApiProperty({ example: '2026-06-22T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
