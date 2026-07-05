import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryRepository } from './inventory.repository';
import {
  CreateSupplierDto,
  CreateInventoryItemDto,
  CreatePurchaseOrderDto,
  AdjustStockDto,
  ReceivePurchaseOrderDto,
} from './dto/inventory.dto';
import { AuditService } from '@common/audit/audit.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly audit: AuditService,
  ) {}

  // ── Suppliers ──────────────────────────────────────────

  async createSupplier(dto: CreateSupplierDto, userId: string) {
    const supplier = await this.inventoryRepo.createSupplier(dto);
    await this.audit.log({
      userId,
      action: 'create',
      resource: 'supplier',
      resourceId: supplier['id'] as string,
    });
    return supplier;
  }

  getSuppliers() {
    return this.inventoryRepo.findSuppliers();
  }

  // ── Items ──────────────────────────────────────────────

  async createItem(dto: CreateInventoryItemDto, userId: string) {
    const itemId = await this.inventoryRepo.createItem(dto, userId);
    await this.audit.log({
      userId,
      action: 'create',
      resource: 'inventory_item',
      resourceId: itemId,
    });
    return itemId;
  }

  getItems(search?: string) {
    return this.inventoryRepo.findItems(search);
  }

  getLowStock() {
    return this.inventoryRepo.getLowStockItems();
  }

  getExpiring(days?: number) {
    return this.inventoryRepo.getExpiringItems(days);
  }

  async adjustStock(itemId: string, dto: AdjustStockDto, userId: string) {
    const type = dto.quantity > 0 ? 'adjustment' : 'adjustment';

    try {
      const balance = await this.inventoryRepo.adjustStock(
        itemId,
        dto.quantity,
        type,
        dto.notes ?? null,
        userId,
      );

      await this.audit.log({
        userId,
        action: 'stock_adjust',
        resource: 'inventory_item',
        resourceId: itemId,
        meta: { quantity: dto.quantity, balance },
      });

      return { itemId, balance };
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  async deductForTreatment(itemId: string, quantity: number, referenceId: string, userId: string) {
    try {
      return this.inventoryRepo.adjustStock(
        itemId,
        -quantity,
        'treatment_use',
        'Auto-deducted on treatment completion',
        userId,
        referenceId,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  getItemTransactions(itemId: string) {
    return this.inventoryRepo.getItemTransactions(itemId);
  }

  // ── Purchase Orders ────────────────────────────────────

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, userId: string) {
    if (!dto.items?.length) throw new BadRequestException('PO must have at least one item');

    const poId = await this.inventoryRepo.createPurchaseOrder(dto, userId);

    await this.audit.log({
      userId,
      action: 'create',
      resource: 'purchase_order',
      resourceId: poId,
    });

    return this.inventoryRepo.findPurchaseOrderById(poId);
  }

  getPurchaseOrders() {
    return this.inventoryRepo.findPurchaseOrders();
  }

  async getPurchaseOrder(id: string) {
    const po = await this.inventoryRepo.findPurchaseOrderById(id);
    if (!po) throw new NotFoundException(`Purchase order not found: ${id}`);
    return po;
  }

  async receivePurchaseOrder(id: string, dto: ReceivePurchaseOrderDto, userId: string) {
    const po = await this.inventoryRepo.findPurchaseOrderById(id);
    if (!po) throw new NotFoundException(`Purchase order not found: ${id}`);

    if (po['status'] === 'received')
      throw new BadRequestException('Purchase order already fully received');

    if (po['status'] === 'cancelled')
      throw new BadRequestException('Cannot receive a cancelled purchase order');

    const newStatus = await this.inventoryRepo.receivePurchaseOrder(id, dto, userId);

    await this.audit.log({
      userId,
      action: 'receive',
      resource: 'purchase_order',
      resourceId: id,
      meta: { status: newStatus },
    });

    return this.inventoryRepo.findPurchaseOrderById(id);
  }
}
