import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export enum contextEnum {
  PATIENT_ASSISTANT = 'patient_assistant',
  PATIENT_DOCTOR = 'patient_doctor',
}

export class StartChatSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiProperty({
    required: false,
    enum: contextEnum,
    default: contextEnum.PATIENT_ASSISTANT,
  })
  @IsOptional()
  @IsString()
  context?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  message!: string;
}
