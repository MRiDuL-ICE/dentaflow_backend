import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalRepository } from './portal.repository';
import { AppointmentModule } from '@modules/appointment/appointment.module';

@Module({
  imports: [AppointmentModule],
  controllers: [PortalController],
  providers: [PortalService, PortalRepository],
})
export class PortalModule {}
