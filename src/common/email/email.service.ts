import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>('app.emailFrom')!;
  }

  async sendMagicLink(email: string, token: string, clinicSlug: string): Promise<void> {
    const appUrl = this.config.get<string>('app.url');
    const link = `${appUrl}/api/auth/magic-link/verify?token=${token}&clinic=${clinicSlug}`;

    console.log('From:', this.from);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Your DentaFlow login link',
      html: `
        <h2>Sign in to DentaFlow</h2>
        <p>Click the link below to sign in. This link expires in 15 minutes.</p>
        <a href="${link}" style="
          background:#1D9E75;
          color:white;
          padding:12px 24px;
          border-radius:6px;
          text-decoration:none;
          display:inline-block;
        ">Sign in to DentaFlow</a>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send magic link to ${email}:`, error);
      return;
    }

    this.logger.log(`Magic link sent to ${email}`);
  }

  async sendWelcome(email: string, firstName: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Welcome to DentaFlow',
      html: `
        <h2>Welcome to DentaFlow, ${firstName}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now sign in using your email and password,
           or request a magic link for passwordless access.</p>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
    }
  }

  async sendAppointmentReminder(
    email: string,
    patientName: string,
    scheduledAt: string,
    clinicName: string,
  ): Promise<void> {
    const date = new Date(scheduledAt).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: `Appointment Reminder — ${clinicName}`,
      html: `
      <h2>Appointment Reminder</h2>
      <p>Dear ${patientName},</p>
      <p>This is a reminder for your upcoming appointment at <strong>${clinicName}</strong>.</p>
      <p><strong>Date & Time:</strong> ${date}</p>
      <p>Please arrive 10 minutes early. If you need to reschedule, contact us as soon as possible.</p>
    `,
    });

    if (error) this.logger.error('Reminder email failed:', error);
  }

  async sendLowStockAlert(
    email: string,
    itemName: string,
    quantity: number,
    reorderLevel: number,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: `Low Stock Alert — ${itemName}`,
      html: `
      <h2>Low Stock Alert</h2>
      <p>The following inventory item is running low:</p>
      <table>
        <tr><td><strong>Item:</strong></td><td>${itemName}</td></tr>
        <tr><td><strong>Current Stock:</strong></td><td>${quantity}</td></tr>
        <tr><td><strong>Reorder Level:</strong></td><td>${reorderLevel}</td></tr>
      </table>
      <p>Please create a purchase order to restock.</p>
    `,
    });

    if (error) this.logger.error('Low stock alert failed:', error);
  }

  async sendOverdueInvoiceAlert(
    email: string,
    patientName: string,
    invoiceNumber: string,
    balance: number,
    dueDate: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: `Invoice ${invoiceNumber} — Payment Overdue`,
      html: `
      <h2>Payment Reminder</h2>
      <p>Dear ${patientName},</p>
      <p>Invoice <strong>${invoiceNumber}</strong> has an outstanding balance of
         <strong>$${balance.toFixed(2)}</strong> that was due on ${dueDate}.</p>
      <p>Please contact us to arrange payment.</p>
    `,
    });

    if (error) this.logger.error('Overdue invoice alert failed:', error);
  }

  async sendStaffAdded(
  email: string,
  firstName: string,
  clinicName: string,
  role: string,
  clinicSlug: string,
): Promise<void> {
  const appUrl  = this.config.get<string>('app.url');
  const loginUrl = `${appUrl}/login/${clinicSlug}`;
  const roleLabel = role.replace(/_/g, ' ');

  const { error } = await this.resend.emails.send({
    from: this.from,
    to: email,
    subject: `You've been added to ${clinicName} on DentaFlow`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#002972">You've joined ${clinicName}</h2>
        <p>Hi ${firstName},</p>
        <p>
          You've been added to <strong>${clinicName}</strong> as a
          <strong style="text-transform:capitalize">${roleLabel}</strong> on DentaFlow.
        </p>
        <p>You can sign in using your existing account:</p>
        <a href="${loginUrl}" style="
          display:inline-block;
          background:#002972;
          color:#fff;
          padding:12px 24px;
          border-radius:6px;
          text-decoration:none;
          margin:8px 0;
        ">Sign in to DentaFlow</a>
        <p style="color:#64748b;font-size:13px">
          If you weren't expecting this, you can ignore this email.
          Contact your clinic administrator if you have questions.
        </p>
      </div>
    `,
  });

  if (error) {
    this.logger.error(`Failed to send staff-added email to ${email}:`, error);
  } else {
    this.logger.log(`Staff-added email sent to ${email}`);
  }
}
}
