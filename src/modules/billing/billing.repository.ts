import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { CreateInvoiceDto, CreatePaymentDto } from './dto/billing.dto';
import { InvoiceRow } from './types/billing.types';

@Injectable()
export class BillingRepository extends BaseRepository {
  constructor(cls: ClsService<TenantClsStore>) {
    super(cls);
  }

  async generateInvoiceNumber(client: PoolClient): Promise<string> {
    const { rows } = await client.query<{ nextval: string }>(
      `SELECT nextval('invoice_number_seq')`,
    );
    const seq = rows[0].nextval.padStart(6, '0');
    return `INV-${new Date().getFullYear()}-${seq}`;
  }

  async createInvoice(dto: CreateInvoiceDto, createdBy: string) {
    return this.transaction(async (client) => {
      const invoiceNumber = await this.generateInvoiceNumber(client);

      // Calculate subtotal from items
      const subtotal = dto.items.reduce((sum, item) => {
        const qty = item.quantity ?? 1;
        const discount = item.discount ?? 0;
        return sum + qty * item.unitCost * (1 - discount / 100);
      }, 0);

      const discount = dto.discount ?? 0;
      const tax = dto.tax ?? 0;
      const total = subtotal * (1 - discount / 100) * (1 + tax / 100);

      // Create invoice
      const { rows: invoiceRows } = await client.query<{ id: string }>(
        `INSERT INTO invoices
           (patient_id, plan_id, appointment_id, invoice_number,
            subtotal, discount, tax, total, due_date,
            notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [
          dto.patientId,
          dto.planId ?? null,
          dto.appointmentId ?? null,
          invoiceNumber,
          subtotal,
          discount,
          tax,
          total,
          dto.dueDate ?? null,
          dto.notes ?? null,
          createdBy,
        ],
      );

      const invoiceId = invoiceRows[0].id;

      // Insert items
      for (const item of dto.items) {
        await client.query(
          `INSERT INTO invoice_items
             (invoice_id, plan_item_id, description,
              quantity, unit_cost, discount)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            invoiceId,
            item.planItemId ?? null,
            item.description,
            item.quantity ?? 1,
            item.unitCost,
            item.discount ?? 0,
          ],
        );
      }

      return invoiceId;
    });
  }

  async findInvoiceById(id: string) {
    const [invoice, items, payments] = await Promise.all([
      this.query<InvoiceRow>(
        `SELECT id, patient_id, plan_id, appointment_id, invoice_number, status, subtotal, discount, tax, total, amount_paid, balance, due_date, notes, created_at, created_by 
        FROM invoices WHERE id = $1`,
        [id],
      ),
      this.query<Record<string, unknown>>(
        `SELECT id, invoice_id, plan_item_id, description, quantity, unit_cost, discount, total, created_at FROM invoice_items WHERE invoice_id = $1`,
        [id],
      ),
      this.query<Record<string, unknown>>(
        `SELECT id, invoice_id, amount, method, reference, notes, paid_at, created_at, created_by FROM payments WHERE invoice_id = $1
         ORDER BY paid_at DESC`,
        [id],
      ),
    ]);

    if (!invoice[0]) return null;
    return { ...invoice[0], items, payments };
  }

  async findInvoicesByPatient(patientId: string) {
    return this.query(
      `SELECT i.*,
              COUNT(p.id)::int     AS payment_count,
              SUM(p.amount)        AS total_paid
       FROM invoices i
       LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.patient_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [patientId],
    );
  }

  async addPayment(invoiceId: string, dto: CreatePaymentDto, createdBy: string) {
    return this.transaction(async (client) => {
      // Get current invoice
      const { rows: invoiceRows } = await client.query<{
        total: string;
        amount_paid: string;
        status: string;
      }>(
        `SELECT total, amount_paid, status FROM invoices
         WHERE id = $1 FOR UPDATE`,
        [invoiceId],
      );

      const invoice = invoiceRows[0];
      const total = parseFloat(invoice.total);
      const amountPaid = parseFloat(invoice.amount_paid) + dto.amount;

      if (amountPaid > total)
        throw new Error(
          `Payment of ${dto.amount} exceeds balance of ${total - parseFloat(invoice.amount_paid)}`,
        );

      // Determine new status
      const newStatus = amountPaid >= total ? 'paid' : 'partial';

      // Insert payment
      const { rows: paymentRows } = await client.query<{ id: string }>(
        `INSERT INTO payments
           (invoice_id, amount, method, reference, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [invoiceId, dto.amount, dto.method, dto.reference ?? null, dto.notes ?? null, createdBy],
      );

      // Update invoice amount_paid + status
      await client.query(
        `UPDATE invoices
         SET amount_paid = $1, status = $2, updated_at = now()
         WHERE id = $3`,
        [amountPaid, newStatus, invoiceId],
      );

      return paymentRows[0].id;
    });
  }

  async updateInvoiceStatus(id: string, status: string) {
    const rows = await this.execute<Record<string, unknown>>(
      `UPDATE invoices
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );
    return rows[0] ?? null;
  }

  async getOverdueInvoices() {
    return this.query(
      `SELECT i.*, p.first_name, p.last_name, p.phone
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
       WHERE i.status NOT IN ('paid','cancelled')
         AND i.due_date < CURRENT_DATE
       ORDER BY i.due_date ASC`,
      [],
    );
  }
}
