import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, IsOptional } from 'class-validator';

export class MagicLinkRequestDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;
}

export class MagicLinkVerifyDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  token!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;
}
