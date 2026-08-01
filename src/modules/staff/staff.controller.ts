import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { InviteStaffDto } from './dto/invite-staff.dto';

@ApiTags('staff')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get all staff members for this clinic' })
  getAll() {
    return this.staffService.getAll();
  }

  @Get('dentists')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get dentists only — for appointment booking dropdown' })
  getDentists() {
    return this.staffService.getDentists();
  }

  @Post('invite')
  @Roles('clinic_owner')
  @ApiOperation({ summary: 'Add an existing user to this clinic as dentist or receptionist' })
  invite(@Body() dto: InviteStaffDto) {
    return this.staffService.invite(dto.email, dto.role);
  }
}
