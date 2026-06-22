import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

export enum ToothStatus {
  HEALTHY = 'healthy',
  CAVITY = 'cavity',
  MISSING = 'missing',
  CROWNED = 'crowned',
  IMPLANT = 'implant',
  BRIDGE = 'bridge',
  ROOT_CANAL = 'root_canal',
  EXTRACTED = 'extracted',
  FRACTURE = 'fracture',
  WATCH = 'watch',
}

export class UpdateToothDto {
  @ApiProperty({ minimum: 1, maximum: 32 })
  @IsInt()
  @Min(1)
  @Max(32)
  toothNumber!: number;

  @ApiProperty({ enum: ToothStatus, required: false })
  @IsOptional()
  @IsEnum(ToothStatus)
  status?: ToothStatus;

  @ApiProperty({
    required: false,
    type: [Number],
    description: '6 pocket depth measurements in mm',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  pocketDepth?: number[];

  @ApiProperty({ required: false, minimum: 0, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  mobility?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  furcation?: number;

  @ApiProperty({
    required: false,
    type: [Boolean],
    description: '6 bleeding points',
  })
  @IsOptional()
  @IsArray()
  @IsBoolean({ each: true })
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  bleeding?: boolean[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
