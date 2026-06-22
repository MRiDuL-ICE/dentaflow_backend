import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { AppointmentStatus } from './update-appointment.dto';

export class AppointmentQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  dentistId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
