import { Injectable, Inject, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export enum JobType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  LOW_STOCK_ALERT = 'low_stock_alert',
  INVOICE_OVERDUE = 'invoice_overdue',
}

@Injectable()
export class JobSchedulerService {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @Inject('NOTIFICATION_QUEUE')
    private readonly queue: Queue,
  ) {}

  async scheduleAppointmentReminder(
    data: {
      appointmentId: string;
      patientEmail: string;
      patientName: string;
      scheduledAt: string;
      clinicName: string;
      clinicSlug: string;
    },
    delay: number,
  ): Promise<void> {
    await this.queue.add(JobType.APPOINTMENT_REMINDER, data, {
      delay,
      jobId: `reminder_${data.appointmentId}`,
    });
    this.logger.log(`Reminder scheduled for appointment: ${data.appointmentId}`);
  }

  async scheduleLowStockAlert(data: {
    itemName: string;
    quantity: number;
    reorderLevel: number;
    clinicSlug: string;
    adminEmail: string;
  }): Promise<void> {
    await this.queue.add(JobType.LOW_STOCK_ALERT, data, {
      jobId: `low_stock_${data.itemName}_${Date.now()}`,
    });
  }

  async scheduleOverdueInvoiceAlert(data: {
    invoiceNumber: string;
    patientName: string;
    patientEmail: string;
    balance: number;
    dueDate: string;
    clinicSlug: string;
  }): Promise<void> {
    await this.queue.add(JobType.INVOICE_OVERDUE, data);
  }

  async cancelAppointmentReminder(appointmentId: string): Promise<void> {
    const job = await this.queue.getJob(`reminder_${appointmentId}`);
    if (job) {
      await job.remove();
      this.logger.log(`Reminder cancelled: ${appointmentId}`);
    }
  }
}
