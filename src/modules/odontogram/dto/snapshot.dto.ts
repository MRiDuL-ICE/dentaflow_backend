import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateToothDto } from './update-tooth.dto';

export class CreateSnapshotDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ type: [UpdateToothDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateToothDto)
  teeth!: UpdateToothDto[];
}
