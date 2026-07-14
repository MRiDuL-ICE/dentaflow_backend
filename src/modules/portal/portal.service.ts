import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PortalRepository } from './portal.repository';
import { AppointmentRepository } from '@modules/appointment/appointment.repository';
import { JobSchedulerService } from '@common/queue/job-scheduler.service';
import { CacheService } from '@common/cache/cache.service';
import { BookAppointmentDto, PortalQueryDto } from './dto/portal.dto';
import { ClsService } from 'nestjs-cls';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';

@Injectable()
export class PortalService {
  constructor(
    private readonly portalRepo: PortalRepository,
    private readonly appointmentRepo: AppointmentRepository,
    private readonly scheduler: JobSchedulerService,
    private readonly cache: CacheService,
    private readonly cls: ClsService<TenantClsStore>,
  ) {}

  private async resolvePatient(userId: string): Promise<string> {
    const clinicId = this.cls.get('clinicId');
    const patient = await this.portalRepo.findPatientByUserId(userId, clinicId);
    if (!patient) throw new ForbiddenException('No patient record linked to your account');
    return patient.id;
  }

  // ── Profile ────────────────────────────────────────────

  async getProfile(userId: string) {
    const patientId = await this.resolvePatient(userId);
    const cacheKey = `portal:profile:${patientId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const record = await this.portalRepo.getPatientRecord(patientId);
    if (!record) throw new NotFoundException('Patient record not found');

    await this.cache.set(cacheKey, record, 300);
    return record;
  }

  // ── Appointments ───────────────────────────────────────

  async getAppointments(userId: string, query: PortalQueryDto) {
    const patientId = await this.resolvePatient(userId);
    const limit = query.limit ?? 10;
    const offset = ((query.page ?? 1) - 1) * limit;

    const { appointments, total } = await this.portalRepo.getAppointments(patientId, limit, offset);

    return {
      data: appointments,
      meta: {
        total,
        page: query.page ?? 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async bookAppointment(userId: string, dto: BookAppointmentDto) {
    const patientId = await this.resolvePatient(userId);

    // Conflict check
    const conflict = await this.appointmentRepo.checkConflict(
      dto.dentistId,
      dto.scheduledAt,
      dto.durationMinutes ?? 30,
    );
    if (conflict) throw new ForbiddenException('This time slot is not available');

    // Create appointment
    const appointment = await this.appointmentRepo.create(
      {
        patientId,
        dentistId: dto.dentistId,
        chairId: dto.chairId,
        treatmentType: dto.treatmentType,
        durationMinutes: dto.durationMinutes ?? 30,
        scheduledAt: dto.scheduledAt,
        notes: dto.notes,
      },
      userId,
    );

    // Schedule reminder only if appointment is >24h away
    const scheduledAt = new Date(dto.scheduledAt);
    const delay = scheduledAt.getTime() - Date.now() - 24 * 60 * 60 * 1000;

    if (delay > 0) {
      // Fetch patient data for the reminder email
      const patientRecord = await this.portalRepo.getPatientRecord(patientId);
      const clinicId = this.cls.get('clinicId');

      // Fetch clinic name from public.clinics
      const clinic = await this.portalRepo.getClinicById(clinicId);

      await this.scheduler.scheduleAppointmentReminder(
        {
          appointmentId: appointment['id'] as string,
          patientEmail: patientRecord?.['email'] as string,
          patientName: `${patientRecord?.['first_name'] as string} ${patientRecord?.['last_name'] as string}`,
          scheduledAt: dto.scheduledAt,
          clinicName: (clinic?.['name'] as string) ?? 'DentaFlow Clinic',
          clinicSlug: (clinic?.['slug'] as string) ?? '',
        },
        delay,
      );

      // Save reminder record in DB
      await this.portalRepo.createReminder({
        patientId,
        appointmentId: appointment['id'] as string,
        type: 'appointment_reminder',
        scheduledAt: new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return appointment;
  }

  // ── Medical Records ────────────────────────────────────

  async getXrays(userId: string) {
    const patientId = await this.resolvePatient(userId);
    return this.portalRepo.getXrays(patientId);
  }

  async getClinicalNotes(userId: string) {
    const patientId = await this.resolvePatient(userId);
    return this.portalRepo.getClinicalNotes(patientId);
  }

  async getTreatmentPlans(userId: string) {
    const patientId = await this.resolvePatient(userId);
    return this.portalRepo.getTreatmentPlans(patientId);
  }

  // ── Billing ────────────────────────────────────────────

  async getInvoices(userId: string) {
    const patientId = await this.resolvePatient(userId);
    return this.portalRepo.getInvoices(patientId);
  }

  // ── Reminders ──────────────────────────────────────────

  async getReminders(userId: string) {
    const patientId = await this.resolvePatient(userId);
    return this.portalRepo.getReminders(patientId);
  }

  // ── AI Chat ────────────────────────────────────────────

  async startAiChat(userId: string) {
    // Returns session context — actual chat via /api/ai/chat
    const patientId = await this.resolvePatient(userId);
    return {
      patientId,
      context: 'patient_assistant',
      message: 'Use POST /api/ai/chat/sessions with this patientId',
    };
  }
}
