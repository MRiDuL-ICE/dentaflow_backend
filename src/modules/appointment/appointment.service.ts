import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentRepository } from './appointment.repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto, AppointmentStatus } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { AuditService } from '@common/audit/audit.service';
import { RabbitMQService } from '@common/rabbitmq/rabbitmq.service';
import { JobSchedulerService } from '@common/queue/job-scheduler.service';
import { ROUTING_KEYS } from '@common/rabbitmq/rabbitmq.interface';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly audit: AuditService,
    private readonly rabbitMQ: RabbitMQService,
    private readonly jobScheduler: JobSchedulerService,
    private readonly cls: ClsService<TenantClsStore>,
  ) {}

  async create(dto: CreateAppointmentDto, userId: string) {
    const conflict = await this.appointmentRepo.checkConflict(
      dto.dentistId,
      dto.scheduledAt,
      dto.durationMinutes,
    );

    if (conflict)
      throw new ConflictException('Dentist already has an appointment in this time slot');

    const appointment = await this.appointmentRepo.create(dto, userId);

    await this.audit.log({
      userId,
      action: 'create',
      resource: 'appointment',
      resourceId: appointment['id'] as string,
    });

    const full = await this.appointmentRepo.findById(appointment['id'] as string);
    return this.toAppointmentDto(full!);
  }

  async findAll(query: AppointmentQueryDto) {
    const { appointments, total } = await this.appointmentRepo.findAll(query);
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;

    return {
      data: appointments.map((row) => this.toAppointmentDto(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const appointment = await this.appointmentRepo.findById(id);
    if (!appointment) throw new NotFoundException(`Appointment not found: ${id}`);
    return this.toAppointmentDto(appointment);
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto, userId: string) {
    const existing = await this.appointmentRepo.findById(id);
    if (!existing) throw new NotFoundException(`Appointment not found: ${id}`);

    const current = existing['status'] as string;
    this.validateTransition(current, dto.status);

    const updated = await this.appointmentRepo.updateStatus(id, dto, userId, current);

    await this.rabbitMQ.publish(ROUTING_KEYS.APPOINTMENT_CONFIRMED, {
      type: 'appointment.status_changed',
      payload: { appointmentId: id, status: dto.status, userId },
    });

    if (dto.status === AppointmentStatus.CONFIRMED) {
      const appt = await this.appointmentRepo.findAppointmentWithPatient(id);
      const clinicId = this.cls.get('clinicId');
      const clinic = await this.appointmentRepo.getClinicInfo(clinicId);
      const scheduled = new Date(appt!['scheduled_at'] as string);
      const delay = scheduled.getTime() - Date.now() - 24 * 60 * 60 * 1000;

      if (delay > 0 && appt?.['patient_email']) {
        await this.jobScheduler.scheduleAppointmentReminder(
          {
            appointmentId: id,
            patientEmail: appt['patient_email'] as string,
            patientName: `${appt['patient_first_name'] as string} ${appt['patient_last_name'] as string}`,
            scheduledAt: scheduled.toISOString(),
            clinicName: (clinic?.['name'] as string) ?? '',
            clinicSlug: (clinic?.['slug'] as string) ?? '',
          },
          delay,
        );
      }
    }

    await this.audit.log({
      userId,
      action: 'status_change',
      resource: 'appointment',
      resourceId: id,
      meta: { from: current, to: dto.status },
    });

    const full = await this.appointmentRepo.findById(id);
    return this.toAppointmentDto(full!);
  }

  async getChairs() {
    return this.appointmentRepo.getChairs();
  }

  private validateTransition(from: string, to: AppointmentStatus): void {
    const allowed: Record<string, AppointmentStatus[]> = {
      scheduled: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      confirmed: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      in_progress: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
      completed: [],
      cancelled: [],
      no_show: [AppointmentStatus.SCHEDULED],
    };

    if (!allowed[from]?.includes(to)) {
      throw new BadRequestException(`Invalid status transition: ${from} → ${to}`);
    }
  }

  private toAppointmentDto(row: Record<string, unknown>) {
    return {
      id: row.id,
      status: row.status,
      scheduledAt: row.scheduled_at,
      treatmentType: row.treatment_type,
      durationMinutes: row.duration_minutes,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      patient: {
        id: row.patient_id,
        firstName: row.patient_first_name,
        lastName: row.patient_last_name,
        email: row.patient_email,
        phone: row.patient_phone,
      },
      dentist: {
        id: row.dentist_id,
        firstName: row.dentist_first_name,
        lastName: row.dentist_last_name,
        email: row.dentist_email,
      },
      chair: row.chair_id ? { id: row.chair_id, name: row.chair_name } : null,
      statusHistory: row.status_history ?? [],
    };
  }
}
