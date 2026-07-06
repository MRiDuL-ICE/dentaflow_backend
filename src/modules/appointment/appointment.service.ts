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

@Injectable()
export class AppointmentService {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly audit: AuditService,
    private readonly rabbitMQ: RabbitMQService,
    private readonly jobScheduler: JobSchedulerService,
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

    return appointment;
  }

  async findAll(query: AppointmentQueryDto) {
    const { appointments, total } = await this.appointmentRepo.findAll(query);
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;

    return {
      data: appointments,
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
    return appointment;
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto, userId: string) {
    const existing = await this.appointmentRepo.findById(id);
    if (!existing) throw new NotFoundException(`Appointment not found: ${id}`);

    const current = existing['status'] as string;

    // Validate status transitions
    this.validateTransition(current, dto.status);

    const updated = await this.appointmentRepo.updateStatus(id, dto, userId, current);

    await this.audit.log({
      userId,
      action: 'status_change',
      resource: 'appointment',
      resourceId: id,
      meta: { from: current, to: dto.status },
    });

    // Publish event
    await this.rabbitMQ.publish(ROUTING_KEYS.APPOINTMENT_CONFIRMED, {
      type: 'appointment.status_changed',
      payload: {
        appointmentId: id,
        status: dto.status,
        userId,
      },
    });

    // Schedule reminder if confirmed
    if (dto.status === AppointmentStatus.CONFIRMED) {
      const appt = await this.appointmentRepo.findById(id);
      const scheduledAt = new Date(appt!['scheduled_at'] as string);
      const delay = scheduledAt.getTime() - Date.now() - 24 * 60 * 60 * 1000;

      if (delay > 0) {
        await this.jobScheduler.scheduleAppointmentReminder(
          {
            appointmentId: id,
            patientEmail: 'patient@example.com', // fetch from patient record
            patientName: 'Patient',
            scheduledAt: scheduledAt.toISOString(),
            clinicName: 'DentaFlow Clinic',
            clinicSlug: 'clinic',
          },
          delay,
        );
      }
    }

    return updated;
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
}
