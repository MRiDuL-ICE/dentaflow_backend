import { ClinicRegisterDto } from '@modules/clinic/dto/clinic-register.dto';
import { ConsoleLogger, Injectable, Logger } from '@nestjs/common';
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

    console.log("From:", this.from);

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
}
