import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SuperAdminLoginDto {
  @ApiProperty({ example: 'admin@dentaflow.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPassword#1234' })
  @IsString()
  @MinLength(8)
  password!: string;
}
