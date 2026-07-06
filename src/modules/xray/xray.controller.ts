import { Controller, Get, Post, Param, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiConsumes } from '@nestjs/swagger';
import { XrayService } from './xray.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { FastifyRequest } from 'fastify';

@ApiTags('xray')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('xray')
export class XrayController {
  constructor(private readonly xrayService: XrayService) {}

  @Post('patient/:patientId/upload')
  @Roles('clinic_owner', 'dentist')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload X-ray and trigger AI analysis' })
  async upload(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: FastifyRequest,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await req.file();
    const appointmentId = req.query
      ? (req.query as Record<string, string>)['appointmentId']
      : undefined;

    return this.xrayService.uploadAndAnalyze(patientId, data!, appointmentId, user.id);
  }

  @Get('patient/:patientId')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get all X-rays for patient' })
  getPatientXrays(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.xrayService.getPatientXrays(patientId);
  }

  @Get(':id')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Get X-ray with analysis results' })
  getXray(@Param('id', ParseUUIDPipe) id: string) {
    return this.xrayService.getXray(id);
  }
}
