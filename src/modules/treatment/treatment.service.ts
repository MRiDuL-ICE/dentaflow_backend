import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TreatmentRepository } from './treatment.repository';
import {
  CreateTreatmentDto,
  CreateTreatmentPlanDto,
  CreatePlanItemDto,
} from './dto/create-treatment.dto';
import { AuditService } from '@common/audit/audit.service';
import { CacheService } from '@common/cache/cache.service';

@Injectable()
export class TreatmentService {
  constructor(
    private readonly treatmentRepo: TreatmentRepository,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ── Catalog ────────────────────────────────────────────

  getCategories() {
    return this.treatmentRepo.getCategories();
  }

  async createTreatment(dto: CreateTreatmentDto, userId: string) {
    const treatment = await this.treatmentRepo.createTreatment(dto);
    await this.audit.log({
      userId,
      action: 'create',
      resource: 'treatment',
      resourceId: treatment['id'] as string,
    });
    return treatment;
  }

  async findTreatments(search?: string) {
    if (!search) {
      const cacheKey = this.cache.catalogKey('treatments');
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;

      const treatments = await this.treatmentRepo.findTreatments();
      await this.cache.set(cacheKey, treatments, this.cache.TTL.CATALOG);
      return treatments;
    }
    return this.treatmentRepo.findTreatments(search);
  }

  // ── Plans ──────────────────────────────────────────────

  async createPlan(dto: CreateTreatmentPlanDto, userId: string) {
    const plan = await this.treatmentRepo.createPlan(dto, userId);
    await this.audit.log({
      userId,
      action: 'create',
      resource: 'treatment_plan',
      resourceId: plan['id'] as string,
    });
    return plan;
  }

  getPatientPlans(patientId: string) {
    return this.treatmentRepo.findPlansByPatient(patientId);
  }

  async getPlan(id: string) {
    const plan = await this.treatmentRepo.findPlanById(id);
    if (!plan) throw new NotFoundException(`Treatment plan not found: ${id}`);
    return plan;
  }

  async addItem(planId: string, dto: CreatePlanItemDto, userId: string) {
    const plan = await this.treatmentRepo.findPlanById(planId);
    if (!plan) throw new NotFoundException(`Plan not found: ${planId}`);
    if (plan['status'] === 'completed' || plan['status'] === 'cancelled')
      throw new BadRequestException(`Cannot add items to a ${plan['status'] as string} plan`);

    const item = await this.treatmentRepo.addPlanItem(planId, dto);
    await this.audit.log({
      userId,
      action: 'add_item',
      resource: 'treatment_plan',
      resourceId: planId,
    });
    return item;
  }

  async updateItemStatus(itemId: string, status: string, userId: string) {
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);

    const item = await this.treatmentRepo.updatePlanItemStatus(itemId, status);
    if (!item) throw new NotFoundException(`Plan item not found: ${itemId}`);

    await this.audit.log({
      userId,
      action: 'update_item_status',
      resource: 'treatment_plan_item',
      resourceId: itemId,
      meta: { status },
    });

    return item;
  }

  async updatePlanStatus(id: string, status: string, userId: string) {
    const valid = ['draft', 'active', 'completed', 'cancelled'];
    if (!valid.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);

    const plan = await this.treatmentRepo.updatePlanStatus(id, status);
    if (!plan) throw new NotFoundException(`Plan not found: ${id}`);

    await this.audit.log({
      userId,
      action: 'update_status',
      resource: 'treatment_plan',
      resourceId: id,
      meta: { status },
    });

    return plan;
  }

  async removeItem(itemId: string, userId: string) {
    const deleted = await this.treatmentRepo.deletePlanItem(itemId);
    if (!deleted) throw new BadRequestException('Can only delete pending items');

    await this.audit.log({
      userId,
      action: 'remove_item',
      resource: 'treatment_plan_item',
      resourceId: itemId,
    });

    return { message: `Item ${itemId} removed` };
  }
}
