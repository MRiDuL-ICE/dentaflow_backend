import * as request from 'supertest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { faker } from '@faker-js/faker';
import { createTestApp } from 'test/helpers/test-app.helper';
import { authHeader, loginAs } from 'test/helpers/auth.helper';
import { createInvoiceFixture } from 'test/helpers/fixtures';

describe('Billing (Integration)', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  const CLINIC_SLUG = process.env.TEST_CLINIC_SLUG ?? 'test-clinic';
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

  describe('POST /api/billing/invoices', () => {
    it('should create invoice with items', async () => {
      const dto = createInvoiceFixture(PATIENT_ID);

      const res = await request(app.getHttpServer())
        .post('/api/billing/invoices')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send(dto);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('invoice_number');
      expect(res.body.data['status']).toBe('draft');
      expect(res.body.data['balance']).toBeGreaterThan(0);
    });

    it('should reject invoice with no items', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/billing/invoices')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({ patientId: PATIENT_ID, items: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/billing/invoices/:id/payments', () => {
    let invoiceId: string;
    let total: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/billing/invoices')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send(createInvoiceFixture(PATIENT_ID));

      invoiceId = res.body.data['id'] as string;
      total = parseFloat(String(res.body.data['total']));
    });

    it('should add partial payment', async () => {
      const partial = total / 2;

      const res = await request(app.getHttpServer())
        .post(`/api/billing/invoices/${invoiceId}/payments`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({ amount: partial, method: 'cash' });

      expect(res.status).toBe(200);
      expect(res.body.data['status']).toBe('partial');
    });

    it('should mark invoice as paid on full payment', async () => {
      const remaining = total / 2;

      const res = await request(app.getHttpServer())
        .post(`/api/billing/invoices/${invoiceId}/payments`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({ amount: remaining, method: 'bkash' });

      expect(res.status).toBe(200);
      expect(res.body.data['status']).toBe('paid');
      expect(parseFloat(String(res.body.data['balance']))).toBe(0);
    });

    it('should reject overpayment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/billing/invoices/${invoiceId}/payments`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({ amount: 9999, method: 'cash' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid payment method', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/billing/invoices/${invoiceId}/payments`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken))
        .send({ amount: 10, method: 'bitcoin' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/billing/invoices/overdue', () => {
    it('should return overdue invoices list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/billing/invoices/overdue')
        .set('x-clinic-slug', CLINIC_SLUG)
        .set(authHeader(accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
