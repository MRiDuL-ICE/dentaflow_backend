import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsEmail,
  MinLength, MaxLength, Matches,
} from 'class-validator';

export class ClinicRegisterDto {
  @ApiProperty({ example: 'Bright Smile Dental' })
  @IsString()
  @MaxLength(100)
  clinicName!: string;

  @ApiProperty({ example: 'bright-smile' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase letters, numbers and hyphens only',
  })
  slug!: string;

  @ApiProperty({ example: 'owner@brightsmile.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
