import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AiRecommendationsService } from './ai-recommendations.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('ai-recommendations')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai/recommendations')
export class AiRecommendationsController {
  constructor(private readonly recommendationsService: AiRecommendationsService) {}

  @Get('patient/:patientId')
  @Roles('clinic_owner', 'dentist')
  @ApiOperation({ summary: 'Get AI treatment recommendations based on odontogram' })
  getRecommendations(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recommendationsService.getRecommendations(patientId, user.id);
  }
}
