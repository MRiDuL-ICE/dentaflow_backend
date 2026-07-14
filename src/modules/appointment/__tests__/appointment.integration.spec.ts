import * as request from 'supertest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { faker } from '@faker-js/faker';
import { createTestApp } from 'test/helpers/test-app.helper';
import { authHeader, loginAs } from 'test/helpers/auth.helper';
import { createAppointmentFixture } from 'test/helpers/fixtures';

describe('Appointments (Integration)', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  const CLINIC_SLUG = process.env.TEST_CLINIC_SLUG ?? 'test-clinic';
  const DENTIST_ID = process.env.TEST_DENTIST_ID ?? faker.string.uuid();
  const PATIENT_ID = process.env.TEST_PATIENT_ID ?? faker.string.uuid();

  beforeAll(async () => {
    app = await createTestApp();

    const tokens = await loginAs(
      app,
      process.env.TEST_CLINIC_OWNER_EMAIL ?? 'owner@test.com',
      process.env.TEST_CLINIC_OWNER_PASSWORD ?? 'TestPass123!',
      CLINIC_SLUG,
    );
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/appointments', () => {
    it('should create appointment successfully', async () => {
      const dto = createAppointmentFixture(PATIENT_ID, DENTIST_ID);

      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send(dto);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data['status']).toBe('scheduled');
    });

    it('should reject invalid date format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({
          patientId: PATIENT_ID,
          dentistId: DENTIST_ID,
          treatmentType: 'Cleaning',
          durationMinutes: 30,
          scheduledAt: 'not-a-date',
        });

      expect(res.status).toBe(400);
    });

    it('should reject without auth token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('x-clinic-slug', CLINIC_SLUG)
        .send(createAppointmentFixture(PATIENT_ID, DENTIST_ID));

      expect(res.status).toBe(401);
    });

    it('should reject without clinic slug header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set(authHeader(accessToken))
        .send(createAppointmentFixture(PATIENT_ID, DENTIST_ID));

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/appointments', () => {
    it('should return paginated appointments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('meta');
      expect(res.body.data.meta).toHaveProperty('total');
    });

    it('should filter by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/appointments?status=scheduled')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/appointments/:id/status', () => {
    let appointmentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send(createAppointmentFixture(PATIENT_ID, DENTIST_ID));

      appointmentId = res.body.data['id'] as string;
    });

    it('should confirm appointment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.data['status']).toBe('confirmed');
    });

    it('should reject invalid status transition', async () => {
      // Try to complete from confirmed (must be in_progress first)
      const res = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({ status: 'completed' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid status transition');
    });

    it('should return 404 for non-existent appointment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/appointments/${faker.string.uuid()}/status`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/appointments/chairs', () => {
    it('should return list of chairs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/appointments/chairs')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
