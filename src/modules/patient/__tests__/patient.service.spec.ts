import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from '../patient.service';
import { PatientRepository } from '../patient.repository';
import { AuditService } from '@common/audit/audit.service';
import { CacheService } from '@common/cache/cache.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { createPatientFixture } from 'test/helpers/fixtures';

const mockPatientRepo = {
  existsByEmail: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  get360: jest.fn(),
  upsertInsurance: jest.fn(),
  replaceEmergencyContacts: jest.fn(),
  replaceCustomFields: jest.fn(),
  transaction: jest.fn(),
};

const mockAudit = { log: jest.fn() };
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  patientKey: (id: string) => `patient:360:${id}`,
  TTL: { PATIENT: 300 },
  invalidatePattern: jest.fn(),
};

describe('PatientService', () => {
  let service: PatientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: PatientRepository, useValue: mockPatientRepo },
        { provide: AuditService, useValue: mockAudit },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create patient successfully', async () => {
      const dto = createPatientFixture();
      const userId = faker.string.uuid();
      const patient = { id: faker.string.uuid(), ...dto };
      mockPatientRepo.findAll.mockResolvedValue({
        patients: [],
        total: 0,
      });
      mockPatientRepo.existsByEmail.mockResolvedValue(false);

      mockPatientRepo.transaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) =>
        fn({}),
      );
      mockPatientRepo.create.mockResolvedValue(patient);
      mockAudit.log.mockResolvedValue(undefined);

      const result = await service.create(dto, userId);

      expect(result).toEqual(patient);
      expect(mockPatientRepo.create).toHaveBeenCalledTimes(1);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          resource: 'patient',
        }),
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      const dto = createPatientFixture();
      mockPatientRepo.findAll.mockResolvedValue({
        patients: [{ id: faker.string.uuid() }],
        total: 1,
      });
      mockPatientRepo.existsByEmail.mockResolvedValue(true);
      await expect(service.create(dto, faker.string.uuid())).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return patient from cache if available', async () => {
      const patientId = faker.string.uuid();
      const cached = { id: patientId, firstName: 'Cached' };

      mockCache.get.mockResolvedValue(cached);

      const result = await service.findOne(patientId);

      expect(result).toEqual(cached);
      expect(mockPatientRepo.get360).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in cache', async () => {
      const patientId = faker.string.uuid();
      const patient = { id: patientId, firstName: 'DB Patient' };

      mockCache.get.mockResolvedValue(null);
      mockPatientRepo.get360.mockResolvedValue(patient);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.findOne(patientId);

      expect(result).toEqual(patient);
      expect(mockPatientRepo.get360).toHaveBeenCalledWith(patientId);
      expect(mockCache.set).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if patient not found', async () => {
      mockCache.get.mockResolvedValue(null);
      mockPatientRepo.get360.mockResolvedValue({});

      await expect(service.findOne(faker.string.uuid())).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete patient and invalidate cache', async () => {
      const patientId = faker.string.uuid();
      const userId = faker.string.uuid();

      mockPatientRepo.softDelete.mockResolvedValue(true);
      mockCache.del.mockResolvedValue(undefined);
      mockAudit.log.mockResolvedValue(undefined);

      const result = await service.remove(patientId, userId);

      expect(result.message).toContain(patientId);
      expect(mockCache.del).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete' }));
    });

    it('should throw NotFoundException if patient not found', async () => {
      mockPatientRepo.softDelete.mockResolvedValue(false);

      await expect(service.remove(faker.string.uuid(), faker.string.uuid())).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
