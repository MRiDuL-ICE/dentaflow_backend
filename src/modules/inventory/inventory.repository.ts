import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import {
  CreateSupplierDto,
  CreateInventoryItemDto,
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from './dto/inventory.dto';
import { PurchaseOrderRow } from './types/inventory.types';

@Injectable()
export class InventoryRepository extends BaseRepository {
  constructor(cls: ClsService<TenantClsStore>) {
    super(cls);
  }

  // ── Suppliers ──────────────────────────────────────────

  async createSupplier(dto: CreateSupplierDto) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO suppliers
         (name, contact_name, email, phone, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        dto.name,
        dto.contactName ?? null,
        dto.email ?? null,
        dto.phone ?? null,
        JSON.stringify(dto.address ?? {}),
        dto.notes ?? null,
      ],
    );
    return rows[0];
  }

  async findSuppliers() {
    return this.query(
      `SELECT id, name, contact_name, email, phone, address, notes, created_at FROM suppliers WHERE is_active = true ORDER BY name`,
      [],
    );
  }

  // ── Inventory Items ────────────────────────────────────

  async createItem(dto: CreateInventoryItemDto, createdBy: string) {
    return this.transaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO inventory_items
           (supplier_id, name, sku, category, description,
            unit, unit_cost, quantity, reorder_level, expiry_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [
          dto.supplierId ?? null,
          dto.name,
          dto.sku ?? null,
          dto.category ?? null,
          dto.description ?? null,
          dto.unit ?? 'piece',
          dto.unitCost,
          dto.quantity ?? 0,
          dto.reorderLevel ?? 0,
          dto.expiryDate ?? null,
        ],
      );

      const itemId = rows[0].id;

      // Record initial stock transaction if quantity > 0
      if ((dto.quantity ?? 0) > 0) {
        await client.query(
          `INSERT INTO inventory_transactions
             (item_id, type, quantity, balance,
              notes, created_by)
           VALUES ($1,'purchase',$2,$2,'Initial stock',  $3)`,
          [itemId, dto.quantity, createdBy],
        );
      }

      return itemId;
    });
  }

  async findItems(search?: string) {
    const conditions = ['is_active = true'];
    const values: unknown[] = [];

    if (search) {
      conditions.push(`(name ILIKE $1 OR sku ILIKE $1 OR category ILIKE $1)`);
      values.push(`%${search}%`);
    }

    return this.query(
      `SELECT ii.*, s.name AS supplier_name,
              CASE WHEN ii.quantity <= ii.reorder_level
                   THEN true ELSE false END AS low_stock
       FROM inventory_items ii
       LEFT JOIN suppliers s ON s.id = ii.supplier_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ii.name`,
      values,
    );
  }

  async getLowStockItems() {
    return this.query(
      `SELECT ii.*, s.name AS supplier_name
       FROM inventory_items ii
       LEFT JOIN suppliers s ON s.id = ii.supplier_id
       WHERE ii.is_active = true
         AND ii.quantity <= ii.reorder_level
       ORDER BY (ii.quantity / NULLIF(ii.reorder_level, 0)) ASC`,
      [],
    );
  }

  async adjustStock(
    itemId: string,
    quantity: number,
    type: string,
    notes: string | null,
    createdBy: string,
    referenceId?: string,
  ) {
    return this.transaction(async (client) => {
      // Lock row for update
      const { rows } = await client.query<{
        quantity: string;
      }>(
        `SELECT quantity FROM inventory_items
         WHERE id = $1 FOR UPDATE`,
        [itemId],
      );

      const current = parseFloat(rows[0].quantity);
      const balance = current + quantity;

      if (balance < 0)
        throw new Error(`Insufficient stock: current ${current}, deducting ${Math.abs(quantity)}`);

      await client.query(
        `UPDATE inventory_items
         SET quantity = $1, updated_at = now()
         WHERE id = $2`,
        [balance, itemId],
      );

      await client.query(
        `INSERT INTO inventory_transactions
           (item_id, type, quantity, balance,
            reference_id, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [itemId, type, quantity, balance, referenceId ?? null, notes, createdBy],
      );

      return balance;
    });
  }

  async getItemTransactions(itemId: string) {
    return this.query(
      `SELECT id, item_id, type, quantity, balance, notes, created_at, created_by, reference_id FROM inventory_transactions
       WHERE item_id = $1
       ORDER BY created_at DESC`,
      [itemId],
    );
  }

  // ── Purchase Orders ────────────────────────────────────

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, createdBy: string) {
    return this.transaction(async (client) => {
      const total = dto.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

      const { rows: poRows } = await client.query<{ id: string }>(
        `INSERT INTO purchase_orders
           (supplier_id, total, notes, created_by)
         VALUES ($1,$2,$3,$4)
         RETURNING id`,
        [dto.supplierId, total, dto.notes ?? null, createdBy],
      );

      const poId = poRows[0].id;

      for (const item of dto.items) {
        await client.query(
          `INSERT INTO purchase_order_items
             (po_id, item_id, quantity, unit_cost, expiry_date)
           VALUES ($1,$2,$3,$4,$5)`,
          [poId, item.itemId, item.quantity, item.unitCost, item.expiryDate ?? null],
        );
      }

      return poId;
    });
  }

  async findPurchaseOrders() {
    return this.query(
      `SELECT po.*, s.name AS supplier_name,
              COUNT(poi.id)::int AS item_count
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
       GROUP BY po.id, s.name
       ORDER BY po.created_at DESC`,
      [],
    );
  }

  async findPurchaseOrderById(id: string) {
    const [po, items] = await Promise.all([
      this.query<PurchaseOrderRow>(
        `SELECT po.*, s.name AS supplier_name
         FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         WHERE po.id = $1`,
        [id],
      ),
      this.query<Record<string, unknown>>(
        `SELECT poi.*, ii.name AS item_name, ii.unit
         FROM purchase_order_items poi
         JOIN inventory_items ii ON ii.id = poi.item_id
         WHERE poi.po_id = $1`,
        [id],
      ),
    ]);

    if (!po[0]) return null;
    return { ...po[0], items };
  }

  async receivePurchaseOrder(poId: string, dto: ReceivePurchaseOrderDto, createdBy: string) {
    return this.transaction(async (client) => {
      for (const received of dto.items) {
        // Update received qty on PO item
        await client.query(
          `UPDATE purchase_order_items
           SET received_qty = received_qty + $1,
               expiry_date  = COALESCE($2, expiry_date)
           WHERE po_id = $3 AND item_id = $4`,
          [received.receivedQty, received.expiryDate ?? null, poId, received.itemId],
        );

        // Update inventory stock
        const { rows: itemRows } = await client.query<{
          quantity: string;
        }>(
          `UPDATE inventory_items
           SET quantity   = quantity + $1,
               expiry_date = COALESCE($2, expiry_date),
               updated_at  = now()
           WHERE id = $3
           RETURNING quantity`,
          [received.receivedQty, received.expiryDate ?? null, received.itemId],
        );

        // Record transaction
        await client.query(
          `INSERT INTO inventory_transactions
             (item_id, type, quantity, balance,
              reference_id, notes, created_by)
           VALUES ($1,'purchase',$2,$3,$4,'PO received',$5)`,
          [
            received.itemId,
            received.receivedQty,
            parseFloat(itemRows[0].quantity),
            poId,
            createdBy,
          ],
        );
      }

      // Check if all items fully received → mark as received
      const { rows: checkRows } = await client.query<{ all_received: boolean }>(
        `SELECT BOOL_AND(received_qty >= quantity) AS all_received
         FROM purchase_order_items WHERE po_id = $1`,
        [poId],
      );

      const newStatus = checkRows[0].all_received ? 'received' : 'partial';

      await client.query(
        `UPDATE purchase_orders
         SET status      = $1,
             received_at = CASE WHEN $1 = 'received' THEN now() ELSE received_at END,
             updated_at  = now()
         WHERE id = $2`,
        [newStatus, poId],
      );

      return newStatus;
    });
  }

  async getExpiringItems(days: number = 30) {
    return this.query(
      `SELECT ii.*, s.name AS supplier_name
       FROM inventory_items ii
       LEFT JOIN suppliers s ON s.id = ii.supplier_id
       WHERE ii.is_active    = true
         AND ii.expiry_date IS NOT NULL
         AND ii.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
       ORDER BY ii.expiry_date ASC`,
      [days],
    );
  }
}
