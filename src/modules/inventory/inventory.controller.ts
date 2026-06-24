import {
  Controller, Get, Post, Patch,
  Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation,
  ApiBearerAuth, ApiSecurity,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateSupplierDto,
  CreateInventoryItemDto,
  CreatePurchaseOrderDto,
  AdjustStockDto,
  ReceivePurchaseOrderDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Suppliers ──────────────────────────────────────────

  @Post('suppliers')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Create supplier' })
  createSupplier(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.createSupplier(dto, user.id);
  }

  @Get('suppliers')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'List suppliers' })
  getSuppliers() {
    return this.inventoryService.getSuppliers();
  }

  // ── Items ──────────────────────────────────────────────

  @Post('items')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Add inventory item' })
  createItem(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.createItem(dto, user.id);
  }

  @Get('items')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'List inventory items' })
  getItems(@Query('search') search?: string) {
    return this.inventoryService.getItems(search);
  }

  @Get('items/low-stock')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Get('items/expiring')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Get items expiring soon' })
  getExpiring(@Query('days') days?: number) {
    return this.inventoryService.getExpiring(days);
  }

  @Get('items/:id/transactions')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Get stock transaction history for item' })
  getTransactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.getItemTransactions(id);
  }

  @Patch('items/:id/adjust')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Manually adjust stock quantity' })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.adjustStock(id, dto, user.id);
  }

  // ── Purchase Orders ────────────────────────────────────

  @Post('purchase-orders')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Create purchase order' })
  createPO(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.createPurchaseOrder(dto, user.id);
  }

  @Get('purchase-orders')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'List purchase orders' })
  getPOs() {
    return this.inventoryService.getPurchaseOrders();
  }

  @Get('purchase-orders/:id')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Get purchase order with items' })
  getPO(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.getPurchaseOrder(id);
  }

  @Patch('purchase-orders/:id/receive')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Receive items from purchase order' })
  receivePO(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.receivePurchaseOrder(id, dto, user.id);
  }
}
