import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('appointments')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Book a new appointment' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.appointmentService.create(dto, user.id);
  }

  @Get()
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'List appointments with filters' })
  findAll(@Query() query: AppointmentQueryDto) {
    return this.appointmentService.findAll(query);
  }

  @Get('chairs')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'List available chairs' })
  getChairs() {
    return this.appointmentService.getChairs();
  }

  @Get(':id')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get appointment with full status history' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Update appointment status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
  //  console.log("updateStatus", id, dto, user); 
    return this.appointmentService.updateStatus(id, dto, user.id);
  }
}
