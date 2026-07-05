import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingRepository } from './billing.repository';
import { CreateInvoiceDto, CreatePaymentDto } from './dto/billing.dto';
import { AuditService } from '@common/audit/audit.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly audit: AuditService,
  ) {}

  async createInvoice(dto: CreateInvoiceDto, userId: string) {
    if (!dto.items?.length) throw new BadRequestException('Invoice must have at least one item');

    const invoiceId = await this.billingRepo.createInvoice(dto, userId);

    await this.audit.log({
      userId,
      action: 'create',
      resource: 'invoice',
      resourceId: invoiceId,
    });

    return this.billingRepo.findInvoiceById(invoiceId);
  }

  async findOne(id: string) {
    const invoice = await this.billingRepo.findInvoiceById(id);
    if (!invoice) throw new NotFoundException(`Invoice not found: ${id}`);
    return invoice;
  }

  getPatientInvoices(patientId: string) {
    return this.billingRepo.findInvoicesByPatient(patientId);
  }

  async addPayment(invoiceId: string, dto: CreatePaymentDto, userId: string) {
    const invoice = await this.billingRepo.findInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundException(`Invoice not found: ${invoiceId}`);

    if (invoice['status'] === 'paid')
      throw new BadRequestException('Invoice is already fully paid');

    if (invoice['status'] === 'cancelled')
      throw new BadRequestException('Cannot pay a cancelled invoice');

    try {
      await this.billingRepo.addPayment(invoiceId, dto, userId);

      await this.audit.log({
        userId,
        action: 'payment',
        resource: 'invoice',
        resourceId: invoiceId,
        meta: { amount: dto.amount, method: dto.method },
      });

      return this.billingRepo.findInvoiceById(invoiceId);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  async updateStatus(id: string, status: string, userId: string) {
    const valid = ['draft', 'sent', 'cancelled'];
    if (!valid.includes(status))
      throw new BadRequestException(`Cannot manually set status to: ${status}`);

    const invoice = await this.billingRepo.updateInvoiceStatus(id, status);
    if (!invoice) throw new NotFoundException(`Invoice not found: ${id}`);

    await this.audit.log({
      userId,
      action: 'status_change',
      resource: 'invoice',
      resourceId: id,
      meta: { status },
    });

    return invoice;
  }

  getOverdueInvoices() {
    return this.billingRepo.getOverdueInvoices();
  }
}
