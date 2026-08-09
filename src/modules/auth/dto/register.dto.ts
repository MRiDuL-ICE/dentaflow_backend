import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsInt } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({ example: 'demo-clinic' })
  @IsOptional()
  @IsString()
  clinicId?: string;

  @ApiProperty({
    example: 3,
    required: false,
    description: '1=super_admin 2=clinic_owner 3=dentist 4=receptionist 5=patient',
  })
  @IsOptional()
  @IsInt()
  roleId?: number;
}
