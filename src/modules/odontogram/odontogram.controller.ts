import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { OdontogramService } from './odontogram.service';
import { UpdateToothDto } from './dto/update-tooth.dto';
import { CreateSnapshotDto } from './dto/snapshot.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('odontogram')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('patients/:patientId/odontogram')
export class OdontogramController {
  constructor(private readonly odontogramService: OdontogramService) {}

  @Get()
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get current odontogram (32 teeth)' })
  getCurrent(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.odontogramService.getCurrent(patientId);
  }

  @Put('tooth')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Update a single tooth record' })
  updateTooth(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdateToothDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.odontogramService.updateTooth(patientId, dto, user.id);
  }

  @Post('snapshot')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Save visit snapshot (updates running record + creates snapshot)' })
  createSnapshot(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateSnapshotDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.odontogramService.createSnapshot(patientId, dto, user.id);
  }

  @Get('snapshots')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get all snapshots or filter by appointment' })
  getSnapshots(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('appointmentId') appointmentId?: string,
  ) {
    return this.odontogramService.getSnapshots(patientId, appointmentId);
  }
}
