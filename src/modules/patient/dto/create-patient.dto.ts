import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  IsObject,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export class AddressDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() street?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() state?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() zip?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() country?: string;
}

export class MedicalHistoryDto {
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EmergencyContactDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() relationship!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
}

export class InsuranceDto {
  @ApiProperty() @IsString() provider!: string;
  @ApiProperty() @IsString() policyNumber!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() groupNumber?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsObject() coverageDetails?: Record<
    string,
    unknown
  >;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() validFrom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() validUntil?: string;
}

export class CustomFieldDto {
  @ApiProperty() @IsString() key!: string;
  @ApiProperty() @IsString() value!: string;
}

export class CreatePatientDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalHistoryDto)
  medicalHistory?: MedicalHistoryDto;

  @ApiProperty({ required: false, type: [EmergencyContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => InsuranceDto)
  insurance?: InsuranceDto;

  @ApiProperty({ required: false, type: [CustomFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[];
}
