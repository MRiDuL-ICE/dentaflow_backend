import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateClinicDto {
  @ApiProperty({ example: 'Bright Smile Dental' })
  @IsString()
  @MaxLength(100)
  clinicName!: string;

  @ApiProperty({ example: 'bright-smile', description: 'URL-safe slug' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase letters, numbers and hyphens only',
  })
  slug!: string;

  @ApiProperty({ example: 'owner@brightsmile.com' })
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  ownerFirstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  ownerLastName!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  ownerPassword!: string;
}
