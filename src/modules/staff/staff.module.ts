import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';
import { DatabaseModule } from '@database/database.module';
import { EmailModule } from '@common/email/email.module';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [StaffController],
  providers: [StaffService, StaffRepository],
  exports: [StaffRepository],
})
export class StaffModule {}
