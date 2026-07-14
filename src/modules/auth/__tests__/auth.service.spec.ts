import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@common/email/email.service';
import { TenantService } from '@common/tenant/tenant.service';
import { REDIS_CLIENT } from '@database/database.module';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { faker } from '@faker-js/faker';

// ── Mocks ──────────────────────────────────────────────

const mockAuthRepo = {
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  addClinicMember: jest.fn(),
  getUserClinicRoles: jest.fn(),
  saveRefreshToken: jest.fn(),
  findRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllUserRefreshTokens: jest.fn(),
  saveMagicLink: jest.fn(),
  findMagicLink: jest.fn(),
  markMagicLinkUsed: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockEmail = {
  sendWelcome: jest.fn(),
  sendMagicLink: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, unknown> = {
      'app.nodeEnv': 'test',
      'jwt.secret': 'test-secret',
    };
    return map[key];
  }),
};

const mockTenantService = {
  resolve: jest.fn(),
};

// ── Tests ──────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService, useValue: mockEmail },
        { provide: TenantService, useValue: mockTenantService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: faker.internet.email(),
      password: 'StrongPass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      clinicId: faker.string.uuid(),
    };

    it('should register a new user successfully', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockAuthRepo.createUser.mockResolvedValue({
        id: faker.string.uuid(),
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: true,
      });
      mockAuthRepo.addClinicMember.mockResolvedValue(undefined);
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.register(dto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(mockAuthRepo.createUser).toHaveBeenCalledTimes(1);
      expect(mockEmail.sendWelcome).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: faker.string.uuid(),
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);

      expect(mockAuthRepo.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const clinicId = faker.string.uuid();

    it('should login with valid credentials', async () => {
      const hashedPass = '$2b$12$fakeHashedPassword';

      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: faker.string.uuid(),
        email: 'test@example.com',
        passwordHash: hashedPass,
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      });

      mockAuthRepo.getUserClinicRoles.mockResolvedValue([{ roleName: 'dentist' }]);

      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      // Mock bcrypt
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'StrongPass123!',
        clinicId,
      });

      expect(result.user.roles).toContain('dentist');
      expect(result.tokens.accessToken).toBe('mock.jwt.token');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: faker.string.uuid(),
        email: 'test@example.com',
        passwordHash: '$2b$12$fakeHash',
        isActive: true,
      });

      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPass',
          clinicId,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: faker.string.uuid(),
        isActive: false,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'any',
          clinicId,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not in clinic', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: faker.string.uuid(),
        passwordHash: '$2b$12$fake',
        isActive: true,
      });

      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(true);

      mockAuthRepo.getUserClinicRoles.mockResolvedValue([]);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'pass',
          clinicId,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const userId = faker.string.uuid();
      mockRedis.get.mockResolvedValue(userId);
      mockAuthRepo.findRefreshToken.mockResolvedValue({
        userId,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      });
      mockAuthRepo.findUserById.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        isActive: true,
      });
      mockAuthRepo.getUserClinicRoles.mockResolvedValue([{ roleName: 'dentist' }]);
      mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);
      mockRedis.del.mockResolvedValue(1);
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.refresh({
        refreshToken: 'valid-token',
        clinicId: faker.string.uuid(),
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw if refresh token not in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.refresh({
          refreshToken: 'invalid-token',
          clinicId: faker.string.uuid(),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
