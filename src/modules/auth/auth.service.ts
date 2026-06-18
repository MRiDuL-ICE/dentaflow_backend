import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { AuthRepository } from './auth.repository';
import { EmailService } from '@common/email/email.service';
import { REDIS_CLIENT } from '@database/database.module';
import { JwtPayload } from './types/jwt-payload.type';
import { AuthResponse, AuthTokens } from './types/auth-response.type';
import { ROLE_IDS } from '@common/rbac/role-ids.constant';

const BCRYPT_ROUNDS      = 12;
const REFRESH_TTL_DAYS   = 30;
const MAGIC_LINK_TTL_MIN = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepo:   AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config:     ConfigService,
    private readonly email:      EmailService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ── Register ───────────────────────────────────────────

  async register(data: {
    email:     string;
    password:  string;
    firstName: string;
    lastName:  string;
    clinicId:  string;
    roleId?:   number;
  }): Promise<AuthResponse> {
    const existing = await this.authRepo.findUserByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = await this.authRepo.createUser({
      email:        data.email,
      passwordHash,
      firstName:    data.firstName,
      lastName:     data.lastName,
    });

    const roleId = data.roleId ?? ROLE_IDS.PATIENT;

    await this.authRepo.addClinicMember({
      userId:   user.id,
      clinicId: data.clinicId,
      roleId,
    });

    void this.email.sendWelcome(user.email, user.firstName);

    const roles  = [this.getRoleName(roleId)];
    const tokens = await this.generateTokens(user.id, user.email, roles, data.clinicId);

    return {
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        roles,
        clinicId:  data.clinicId,
      },
      tokens,
    };
  }

  // ── Login ──────────────────────────────────────────────

  async login(data: {
    email:    string;
    password: string;
    clinicId: string;
  }): Promise<AuthResponse> {
    const user = await this.authRepo.findUserByEmail(data.email);

    if (!user?.isActive)
      throw new UnauthorizedException('Invalid credentials');

    if (!user.passwordHash)
      throw new UnauthorizedException(
        'This account uses magic link — no password set',
      );

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const members = await this.authRepo.getUserClinicRoles(
      user.id,
      data.clinicId,
    );

    if (!members.length)
      throw new UnauthorizedException('No access to this clinic');

    const roles  = members.map(m => m.roleName);
    const tokens = await this.generateTokens(
      user.id, user.email, roles, data.clinicId,
    );

    return {
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        roles,
        clinicId:  data.clinicId,
      },
      tokens,
    };
  }

  // ── Refresh ────────────────────────────────────────────

  async refresh(data: {
    refreshToken: string;
    clinicId:     string;
  }): Promise<AuthTokens> {
    // Check Redis first (fast path)
    const cached = await this.redis.get(`refresh:${data.refreshToken}`);
    if (!cached) throw new UnauthorizedException('Invalid or expired refresh token');

    const userId = cached;

    // Check Postgres (audit + revocation check)
    const dbToken = await this.authRepo.findRefreshToken(data.refreshToken);
    if (!dbToken || dbToken.revokedAt)
      throw new UnauthorizedException('Refresh token revoked');

    if (new Date() > dbToken.expiresAt)
      throw new UnauthorizedException('Refresh token expired');

    const user = await this.authRepo.findUserById(userId);
    if (!user?.isActive) throw new UnauthorizedException('User not found');

    const members = await this.authRepo.getUserClinicRoles(
      userId,
      data.clinicId,
    );

    const roles = members.map(m => m.roleName);

    // Rotate refresh token
    await this.revokeRefreshToken(data.refreshToken);
    return this.generateTokens(userId, user.email, roles, data.clinicId);
  }

  // ── Logout ─────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.authRepo.revokeAllUserRefreshTokens(userId);
    // Can't efficiently delete all Redis keys without a scan
    // Postgres revocation is the source of truth for logoutAll
    this.logger.log(`All sessions revoked for user ${userId}`);
  }

  // ── Magic Link ─────────────────────────────────────────

  async sendMagicLink(email: string): Promise<void> {
    const user  = await this.authRepo.findUserByEmail(email);
    const token = uuidv4();

    const expiresAt = new Date(
      Date.now() + MAGIC_LINK_TTL_MIN * 60 * 1000,
    );

    await this.authRepo.saveMagicLink({
      userId: user?.id ?? null,
      email,
      token,
      expiresAt,
    });

    // Also store in Redis for fast lookup
    await this.redis.set(
      `magic:${token}`,
      email,
      'EX',
      MAGIC_LINK_TTL_MIN * 60,
    );

    await this.email.sendMagicLink(email, token);
  }

  async verifyMagicLink(data: {
    token:     string;
    clinicId:  string;
    firstName?: string;
    lastName?:  string;
  }): Promise<AuthResponse> {
    const cached = await this.redis.get(`magic:${data.token}`);
    if (!cached) throw new BadRequestException('Magic link expired or invalid');

    const link = await this.authRepo.findMagicLink(data.token);
    if (!link)         throw new BadRequestException('Magic link not found');
    if (link.usedAt)   throw new BadRequestException('Magic link already used');
    if (new Date() > link.expiresAt)
      throw new BadRequestException('Magic link expired');

    await this.authRepo.markMagicLinkUsed(data.token);
    await this.redis.del(`magic:${data.token}`);

    // Create user if doesn't exist
    let user = await this.authRepo.findUserByEmail(link.email);
    if (!user) {
      if (!data.firstName || !data.lastName)
        throw new BadRequestException(
          'First name and last name required for new users',
        );

      user = await this.authRepo.createUser({
        email:        link.email,
        passwordHash: null,
        firstName:    data.firstName,
        lastName:     data.lastName,
      });

      await this.authRepo.addClinicMember({
        userId:   user.id,
        clinicId: data.clinicId,
        roleId:   ROLE_IDS.PATIENT,
      });
    }

    const members = await this.authRepo.getUserClinicRoles(
      user.id,
      data.clinicId,
    );

    const roles  = members.length
      ? members.map(m => m.roleName)
      : ['patient'];

    const tokens = await this.generateTokens(
      user.id, user.email, roles, data.clinicId,
    );

    return {
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        roles,
        clinicId:  data.clinicId,
      },
      tokens,
    };
  }

  // ── Helpers ────────────────────────────────────────────

  private async generateTokens(
    userId:   string,
    email:    string,
    roles:    string[],
    clinicId: string | null,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, roles, clinicId };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const refreshToken = uuidv4();
    const expiresAt    = new Date(
      Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    // Save to Postgres (audit)
    await this.authRepo.saveRefreshToken({
      userId,
      token: refreshToken,
      expiresAt,
    });

    // Save to Redis (fast validation)
    await this.redis.set(
      `refresh:${refreshToken}`,
      userId,
      'EX',
      REFRESH_TTL_DAYS * 24 * 60 * 60,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    await Promise.all([
      this.authRepo.revokeRefreshToken(token),
      this.redis.del(`refresh:${token}`),
    ]);
  }

  private getRoleName(roleId: number): string {
    const map: Record<number, string> = {
      [ROLE_IDS.SUPER_ADMIN]:  'super_admin',
      [ROLE_IDS.CLINIC_OWNER]: 'clinic_owner',
      [ROLE_IDS.DENTIST]:      'dentist',
      [ROLE_IDS.RECEPTIONIST]: 'receptionist',
      [ROLE_IDS.PATIENT]:      'patient',
    };
    return map[roleId] ?? 'patient';
  }
}
