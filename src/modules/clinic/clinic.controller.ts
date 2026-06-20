import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClinicService } from './clinic.service';
import { ClinicRegisterDto } from './dto/clinic-register.dto';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('clinic')
@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Self-register a new clinic (no slug header needed)' })
  async register(@Body() dto: ClinicRegisterDto) {
    return this.clinicService.selfRegister({
      clinicName: dto.clinicName,
      slug:       dto.slug,
      email:      dto.email,
      firstName:  dto.firstName,
      lastName:   dto.lastName,
      password:   dto.password,
    });
  }
}
