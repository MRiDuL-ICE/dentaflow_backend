import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { MagicLinkRequestDto, MagicLinkVerifyDto } from './dto/magic-link.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { ClsService } from 'nestjs-cls';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';

@ApiTags('auth')
@ApiSecurity('clinic-slug')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cls: ClsService<TenantClsStore>,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user in a clinic' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    const clinicId = this.cls.get('clinicId');
    return this.authService.register({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      clinicId,
      roleId: dto.roleId,
    });
  }

  @Get('resolve-clinic')
  @Public()
  @ApiOperation({ summary: 'Find which clinics an email belongs to' })
  async resolveClinic(@Query('email') email: string) {
    return this.authService.resolveClinicByEmail(email);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const clinicId = this.cls.get('clinicId');
    return this.authService.login({
      email: dto.email,
      password: dto.password,
      clinicId,
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshDto) {
    const clinicId = this.cls.get('clinicId');
    return this.authService.refresh({
      refreshToken: dto.refreshToken,
      clinicId,
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — revoke refresh token' })
  async logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@CurrentUser() user: AuthUser) {
    return this.authService.logoutAll(user.id);
  }

  @Post('magic-link')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request magic link email' })
  async requestMagicLink(@Body() dto: MagicLinkRequestDto) {
    await this.authService.sendMagicLink(dto.email, dto.clinicSlug);
    return { message: 'Magic link sent if email exists' };
  }

  @Get('magic-link/verify')
  @Public()
  @ApiOperation({ summary: 'Verify magic link token' })
  async verifyMagicLink(@Query() dto: MagicLinkVerifyDto) {
    const clinicId = this.cls.get('clinicId');
    return this.authService.verifyMagicLink({
      token: dto.token,
      clinicId,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user' })
  async me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
