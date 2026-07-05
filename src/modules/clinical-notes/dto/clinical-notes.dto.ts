import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean, MaxLength } from 'class-validator';

export enum NoteType {
  GENERAL = 'general',
  TREATMENT = 'treatment',
  EXAMINATION = 'examination',
  PRESCRIPTION = 'prescription',
  FOLLOWUP = 'followup',
}

export class GenerateNoteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ enum: NoteType, default: NoteType.GENERAL })
  @IsOptional()
  @IsEnum(NoteType)
  noteType?: NoteType;

  @ApiProperty({
    description: 'Context for AI note generation',
    example:
      'Patient presented with tooth pain in upper left quadrant. Examination revealed caries on tooth 26. Composite filling performed.',
  })
  @IsString()
  @MaxLength(2000)
  context!: string;
}

export class SaveNoteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ enum: NoteType })
  @IsEnum(NoteType)
  noteType!: NoteType;

  @ApiProperty()
  @IsString()
  finalNote!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  aiGenerated?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isAiAssisted?: boolean;
}
