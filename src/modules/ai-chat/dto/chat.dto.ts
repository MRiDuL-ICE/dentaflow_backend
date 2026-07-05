import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsOptional,
  IsUUID, MaxLength,
} from 'class-validator';

const contextEnum = ['patient_assistant', 'clinical_assistant'];

export class StartChatSessionDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsUUID()
  patientId?: string;

  @ApiProperty({
    required: false,
    enum: contextEnum,
    default: contextEnum[0],
  })
  @IsOptional() @IsString()
  context?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString() @MaxLength(2000)
  message!: string;
}

