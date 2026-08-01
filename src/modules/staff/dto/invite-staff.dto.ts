import { IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteStaffDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'dentist', enum: ['dentist', 'receptionist'] })
  @IsIn(['dentist', 'receptionist'])
  role!: 'dentist' | 'receptionist';
}
