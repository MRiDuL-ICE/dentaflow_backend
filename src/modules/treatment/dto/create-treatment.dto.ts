import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateTreatmentDto {
  @ApiProperty()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: 'Composite Filling' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  baseCost!: number;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  toothApplicable?: boolean;
}

export class CreateTreatmentPlanDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ example: 'Phase 1 Treatment' })
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePlanItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  treatmentId?: string;

  @ApiProperty({ example: 'Composite Filling — Tooth 14' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  toothNumbers?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  materialsUsed?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
