import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  refreshToken!: string;
}
