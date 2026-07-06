import { Controller, Get, Post, Put, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ClinicalNotesService } from './clinical-notes.service';
import { GenerateNoteDto, SaveNoteDto } from './dto/clinical-notes.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('clinical-notes')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('clinical-notes')
export class ClinicalNotesController {
  constructor(private readonly notesService: ClinicalNotesService) {}

  @Post('generate/:patientId')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'AI-generate clinical note draft' })
  generate(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: GenerateNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notesService.generateNote(patientId, dto, user.id);
  }

  @Post('patient/:patientId')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Save clinical note (AI-assisted or manual)' })
  saveNote(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: SaveNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notesService.saveNote(patientId, user.id, dto);
  }

  @Get('patient/:patientId')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get all clinical notes for patient' })
  getPatientNotes(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.notesService.getPatientNotes(patientId);
  }

  @Get(':id')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Get single clinical note' })
  getNote(@Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.getNote(id);
  }

  @Put(':id')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Update clinical note' })
  updateNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('finalNote') finalNote: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notesService.updateNote(id, finalNote, user.id);
  }
}
