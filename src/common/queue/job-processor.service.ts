import { Injectable, Logger, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { REDIS_CLIENT } from '@database/database.module';
import { EmailService } from '@common/email/email.service';
import { JobType } from './job-scheduler.service';
import { NOTIFICATION_QUEUE } from './queue.module';
import Redis from 'ioredis';

@Injectable()
export class JobProcessorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobProcessorService.name);
  private worker!: Worker;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly email: EmailService,
  ) {}

  onApplicationBootstrap(): void {
    this.worker = new Worker(NOTIFICATION_QUEUE, async (job: Job) => this.processJob(job), {
      connection: this.redis,
    });

    this.worker.on('completed', (job) => this.logger.log(`Job completed: ${job.name} [${job.id}]`));

    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job failed: ${job?.name} — ${err.message}`),
    );

    this.logger.log('BullMQ worker started');
  }

  private async processJob(job: Job): Promise<void> {
    switch (job.name) {
      case JobType.APPOINTMENT_REMINDER:
        await this.processAppointmentReminder(job.data);
        break;
      case JobType.LOW_STOCK_ALERT:
        await this.processLowStockAlert(job.data);
        break;
      case JobType.INVOICE_OVERDUE:
        await this.processOverdueInvoice(job.data);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async processAppointmentReminder(data: {
    appointmentId: string;
    patientEmail: string;
    patientName: string;
    scheduledAt: string;
    clinicName: string;
  }): Promise<void> {
    await this.email.sendAppointmentReminder(
      data.patientEmail,
      data.patientName,
      data.scheduledAt,
      data.clinicName,
    );
    this.logger.log(`Reminder sent to: ${data.patientEmail}`);
  }

  private async processLowStockAlert(data: {
    itemName: string;
    quantity: number;
    reorderLevel: number;
    adminEmail: string;
  }): Promise<void> {
    await this.email.sendLowStockAlert(
      data.adminEmail,
      data.itemName,
      data.quantity,
      data.reorderLevel,
    );
    this.logger.log(`Low stock alert sent: ${data.itemName}`);
  }

  private async processOverdueInvoice(data: {
    invoiceNumber: string;
    patientName: string;
    patientEmail: string;
    balance: number;
    dueDate: string;
  }): Promise<void> {
    await this.email.sendOverdueInvoiceAlert(
      data.patientEmail,
      data.patientName,
      data.invoiceNumber,
      data.balance,
      data.dueDate,
    );
    this.logger.log(`Overdue alert sent: ${data.invoiceNumber}`);
  }
}
