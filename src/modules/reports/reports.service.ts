import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '@modules/analytics/analytics.repository';
import { BillingRepository } from '@modules/billing/billing.repository';
import { PatientRepository } from '@modules/patient/patient.repository';
import * as PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ReportsService {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly billingRepo: BillingRepository,
    private readonly patientRepo: PatientRepository,
  ) {}

  // ── Revenue Report ─────────────────────────────────────

  async generateRevenueReportPdf(days: number = 30): Promise<Buffer> {
    const [daily, byMethod] = await Promise.all([
      this.analyticsRepo.getRevenueDaily(days),
      this.analyticsRepo.getRevenueByPaymentMethod(),
    ]);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('DentaFlow — Revenue Report', { align: 'center' });
      doc
        .fontSize(12)
        .text(`Period: Last ${days} days  |  Generated: ${new Date().toLocaleDateString()}`, {
          align: 'center',
        });
      doc.moveDown(2);

      // Summary
      const totalRevenue = (daily as Record<string, unknown>[]).reduce(
        (sum, d) => sum + parseFloat(String(d['revenue'] ?? 0)),
        0,
      );

      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(11).text(`Total Revenue: $${totalRevenue.toFixed(2)}`);
      doc.text(`Total Days with Revenue: ${daily.length}`);
      doc.moveDown();

      // Daily breakdown
      doc.fontSize(14).text('Daily Revenue', { underline: true });
      doc.moveDown(0.5);

      for (const row of daily as Record<string, unknown>[]) {
        doc
          .fontSize(10)
          .text(
            `${String(row['date']).split('T')[0]}  —  ` +
              `Revenue: $${parseFloat(String(row['revenue'] ?? 0)).toFixed(2)}  |  ` +
              `Invoices: ${row['invoice_count'] as number}`,
          );
      }

      doc.moveDown();

      // By payment method
      doc.fontSize(14).text('Revenue by Payment Method', { underline: true });
      doc.moveDown(0.5);

      for (const row of byMethod as Record<string, unknown>[]) {
        doc
          .fontSize(10)
          .text(
            `${String(row['method']).toUpperCase()}  —  ` +
              `Total: $${parseFloat(String(row['total'] ?? 0)).toFixed(2)}  |  ` +
              `Count: ${row['count'] as number}`,
          );
      }

      doc.end();
    });
  }

  async generateRevenueReportCsv(days: number = 30): Promise<string> {
    const daily = (await this.analyticsRepo.getRevenueDaily(days)) as Record<string, unknown>[];

    return stringify(daily, {
      header: true,
      columns: {
        date: 'Date',
        revenue: 'Revenue',
        invoice_count: 'Invoice Count',
        payment_count: 'Payment Count',
      },
    });
  }

  // ── Patient Report ─────────────────────────────────────

  async generatePatientReportCsv(): Promise<string> {
    const { patients } = await this.patientRepo.findAll({
      limit: 10000,
      offset: 0,
    });

    const rows = patients.map((p) => ({
      id: p.id,
      first_name: p.firstName,
      last_name: p.lastName,
      date_of_birth: p.dateOfBirth,
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      created_at: p.createdAt,
    }));

    return stringify(rows, {
      header: true,
      columns: {
        id: 'ID',
        first_name: 'First Name',
        last_name: 'Last Name',
        date_of_birth: 'Date of Birth',
        gender: 'Gender',
        phone: 'Phone',
        email: 'Email',
        created_at: 'Registered',
      },
    });
  }

  // ── Invoice Report ─────────────────────────────────────

  async generateInvoiceReportCsv(patientId?: string): Promise<string> {
    const invoices = patientId
      ? ((await this.billingRepo.findInvoicesByPatient(patientId)) as Record<string, unknown>[])
      : ((await this.billingRepo.getOverdueInvoices()) as Record<string, unknown>[]);

    return stringify(invoices, {
      header: true,
      columns: {
        invoice_number: 'Invoice #',
        status: 'Status',
        total: 'Total',
        amount_paid: 'Paid',
        balance: 'Balance',
        due_date: 'Due Date',
        created_at: 'Created',
      },
    });
  }

  // ── Patient Invoice PDF ────────────────────────────────

  async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = (await this.billingRepo.findInvoiceById(invoiceId)) as Record<string, unknown>;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('DentaFlow', { align: 'left' });
      doc.fontSize(10).text('Dental Clinic Management System');
      doc.moveDown();

      // Invoice details
      doc.fontSize(16).text(`Invoice #${invoice['invoice_number'] as string}`, { align: 'right' });
      doc
        .fontSize(10)
        .text(`Status: ${String(invoice['status']).toUpperCase()}`, { align: 'right' });
      doc.moveDown(2);

      // Items table
      doc.fontSize(12).text('Items', { underline: true });
      doc.moveDown(0.5);

      const items = invoice['items'] as Record<string, unknown>[];
      for (const item of items) {
        doc
          .fontSize(10)
          .text(
            `${item['description'] as string}  x${item['quantity'] as number}  ` +
              `@ $${parseFloat(String(item['unit_cost'])).toFixed(2)}  =  ` +
              `$${parseFloat(String(item['total'])).toFixed(2)}`,
          );
      }

      doc.moveDown();
      doc.fontSize(11).text(`Subtotal: $${parseFloat(String(invoice['subtotal'])).toFixed(2)}`, {
        align: 'right',
      });
      doc.text(`Total:    $${parseFloat(String(invoice['total'])).toFixed(2)}`, { align: 'right' });
      doc.text(`Paid:     $${parseFloat(String(invoice['amount_paid'])).toFixed(2)}`, {
        align: 'right',
      });
      doc.fontSize(13).text(`Balance:  $${parseFloat(String(invoice['balance'])).toFixed(2)}`, {
        align: 'right',
      });

      // Payments
      const payments = invoice['payments'] as Record<string, unknown>[];
      if (payments?.length) {
        doc.moveDown();
        doc.fontSize(12).text('Payment History', { underline: true });
        doc.moveDown(0.5);
        for (const p of payments) {
          doc
            .fontSize(10)
            .text(
              `${String(p['paid_at']).split('T')[0]}  —  ` +
                `${String(p['method']).toUpperCase()}  ` +
                `$${parseFloat(String(p['amount'])).toFixed(2)}`,
            );
        }
      }

      doc.end();
    });
  }
}
