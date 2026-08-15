import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('patients')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Create a new patient (full 360°)' })
  async create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthUser) {
    return this.patientService.create(dto, user.id);
  }

  @Get()
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'List all patients with search + pagination' })
  async findAll(@Query() query: PatientQueryDto) {
    return this.patientService.findAll(query);
  }

  @Get(':id')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get patient 360° view' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientService.findOne(id);
  }

  @Put(':id')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Update patient' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('clinic_owner', 'dentist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete patient' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.patientService.remove(id, user.id);
  }

  @Post(':id/invite-portal')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Invite patient to portal — creates account if needed' })
  inviteToPortal(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientService.inviteToPortal(id);
  }

  // find patient by email
  @Get('email/:email')
  @Public()
  @ApiOperation({ summary: 'Find patient by email' })
  async findByEmail(@Param('email') email: string) {
    return this.patientService.findByEmail(email);
  }
}
