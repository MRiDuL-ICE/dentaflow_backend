import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { BookAppointmentDto, PortalQueryDto } from './dto/portal.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('patient-portal')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Roles('patient')
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get my patient profile' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.portalService.getProfile(user.id);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Get my appointments' })
  getAppointments(@CurrentUser() user: AuthUser, @Query() query: PortalQueryDto) {
    return this.portalService.getAppointments(user.id, query);
  }

  @Post('appointments')
  @ApiOperation({ summary: 'Book an appointment' })
  bookAppointment(@CurrentUser() user: AuthUser, @Body() dto: BookAppointmentDto) {
    return this.portalService.bookAppointment(user.id, dto);
  }

  @Get('xrays')
  @ApiOperation({ summary: 'View my X-rays' })
  getXrays(@CurrentUser() user: AuthUser) {
    return this.portalService.getXrays(user.id);
  }

  @Get('clinical-notes')
  @ApiOperation({ summary: 'View my clinical notes' })
  getClinicalNotes(@CurrentUser() user: AuthUser) {
    return this.portalService.getClinicalNotes(user.id);
  }

  @Get('treatment-plans')
  @ApiOperation({ summary: 'View my treatment plans' })
  getTreatmentPlans(@CurrentUser() user: AuthUser) {
    return this.portalService.getTreatmentPlans(user.id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'View my invoices and payment history' })
  getInvoices(@CurrentUser() user: AuthUser) {
    return this.portalService.getInvoices(user.id);
  }

  @Get('reminders')
  @ApiOperation({ summary: 'View my upcoming reminders' })
  getReminders(@CurrentUser() user: AuthUser) {
    return this.portalService.getReminders(user.id);
  }

  @Get('ai-chat')
  @ApiOperation({ summary: 'Get AI chat context for patient' })
  getAiChatContext(@CurrentUser() user: AuthUser) {
    return this.portalService.startAiChat(user.id);
  }
}
