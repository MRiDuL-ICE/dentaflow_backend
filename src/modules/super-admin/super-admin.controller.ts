import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Patch,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/rbac/roles.decorator';
import { ListClinicsQueryDto } from './dto/list-clinics-query.dto';

@ApiTags('super-admin')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super admin login (no clinic slug needed)' })
  async login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminService.login(dto.email, dto.password);
  }

  @Post('clinics')
  @UseGuards(JwtAuthGuard)
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new clinic + provision tenant schema' })
  @ApiResponse({ status: 201, description: 'Clinic created successfully' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  async createClinic(@Body() dto: CreateClinicDto) {
    return this.superAdminService.createClinic({
      clinicName: dto.clinicName,
      slug: dto.slug,
      ownerEmail: dto.ownerEmail,
      ownerFirstName: dto.ownerFirstName,
      ownerLastName: dto.ownerLastName,
      ownerPassword: dto.ownerPassword,
    });
  }

  @Get('clinics')
  @UseGuards(JwtAuthGuard)
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all clinics' })
  listClinics(@Query() query: ListClinicsQueryDto) {
    return this.superAdminService.listClinics(query.page, query.limit);
  }

  @Get('clinics/:slug')
  @UseGuards(JwtAuthGuard)
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get clinic detail by slug' })
  getClinic(@Param('slug') slug: string) {
    return this.superAdminService.getClinicBySlug(slug);
  }

  @Patch('clinics/:slug/deactivate')
  @UseGuards(JwtAuthGuard)
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Deactivate a clinic' })
  deactivateClinic(@Param('slug') slug: string) {
    return this.superAdminService.deactivateClinic(slug);
  }
}
