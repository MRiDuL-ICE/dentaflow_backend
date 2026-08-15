import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { TreatmentService } from './treatment.service';
import {
  CreateTreatmentDto,
  CreateTreatmentPlanDto,
  CreatePlanItemDto,
} from './dto/create-treatment.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('treatments')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('treatments')
export class TreatmentController {
  constructor(private readonly treatmentService: TreatmentService) {}

  // ── Catalog ────────────────────────────────────────────

  @Get('categories')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get treatment categories' })
  getCategories() {
    return this.treatmentService.getCategories();
  }

  @Get('catalog')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOperation({ summary: 'Get treatment catalog' })
  getCatalog(@Query('search') search?: string) {
    return this.treatmentService.findTreatments(search);
  }

  @Post('catalog')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Add treatment to catalog' })
  createTreatment(@Body() dto: CreateTreatmentDto, @CurrentUser() user: AuthUser) {
    return this.treatmentService.createTreatment(dto, user.id);
  }

  // ── Plans ──────────────────────────────────────────────

  @Post('plans')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Create treatment plan for patient' })
  createPlan(@Body() dto: CreateTreatmentPlanDto, @CurrentUser() user: AuthUser) {
    return this.treatmentService.createPlan(dto, user.id);
  }

  @Get('plans/patient/:patientId')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get all treatment plans for a patient' })
  getPatientPlans(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.treatmentService.getPatientPlans(patientId);
  }

  @Get('plans/:id')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get treatment plan with all items' })
  getPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.treatmentService.getPlan(id);
  }

  @Patch('plans/:id/status')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Update treatment plan status' })
  updatePlanStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.treatmentService.updatePlanStatus(id, status, user.id);
  }

  // ── Plan Items ─────────────────────────────────────────

  @Post('plans/:planId/items')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Add item to treatment plan' })
  addItem(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreatePlanItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.treatmentService.addItem(planId, dto, user.id);
  }

  @Patch('plans/items/:itemId/status')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Update plan item status' })
  updateItemStatus(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body('status') status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.treatmentService.updateItemStatus(itemId, status, user.id);
  }

  @Delete('plans/items/:itemId')
  @Roles('clinic_owner', 'dentist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove pending item from plan' })
  removeItem(@Param('itemId', ParseUUIDPipe) itemId: string, @CurrentUser() user: AuthUser) {
    return this.treatmentService.removeItem(itemId, user.id);
  }

  @Post('categories')
  @Roles('clinic_owner')
  @ApiOperation({ summary: 'Create treatment category' })
  createCategory(@Body() body: { name: string; color: string }) {
    return this.treatmentService.createCategory(body.name, body.color);
  }

  @Patch('categories/:id')
  @Roles('clinic_owner')
  @ApiOperation({ summary: 'Update treatment category' })
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name: string; color: string },
  ) {
    return this.treatmentService.updateCategory(id, body.name, body.color);
  }

  @Patch('categories/:id/toggle')
  @Roles('clinic_owner')
  @ApiOperation({ summary: 'Toggle category active state' })
  toggleCategory(@Param('id', ParseUUIDPipe) id: string, @Body('isActive') isActive: boolean) {
    return this.treatmentService.toggleCategory(id, isActive);
  }

  @Patch('catalog/:id/duration')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Update treatment default duration' })
  updateDuration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('durationMinutes') durationMinutes: number,
  ) {
    return this.treatmentService.updateTreatmentDuration(id, durationMinutes);
  }
}
