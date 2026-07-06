import { Module } from '@nestjs/common';
import { XrayController } from './xray.controller';
import { XrayService } from './xray.service';
import { XrayRepository } from './xray.repository';

@Module({
  controllers: [XrayController],
  providers: [XrayService, XrayRepository],
})
export class XrayModule {}
