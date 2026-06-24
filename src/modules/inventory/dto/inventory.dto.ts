import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsOptional,
  IsUUID, IsDateString,
  IsArray, ValidateNested,
  Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierDto {
  @ApiProperty() @IsString() @MaxLength(100)
  name!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  contactName?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  email?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  phone?: string;

  @ApiProperty({ required: false }) @IsOptional()
  address?: Record<string, unknown>;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  notes?: string;
}

export class CreateInventoryItemDto {
  @ApiProperty({ required: false }) @IsOptional() @IsUUID()
  supplierId?: string;

  @ApiProperty() @IsString() @MaxLength(100)
  name!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  sku?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  category?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ default: 'piece' }) @IsOptional() @IsString()
  unit?: string;

  @ApiProperty() @IsNumber() @Min(0)
  unitCost!: number;

  @ApiProperty({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @ApiProperty({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  reorderLevel?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsDateString()
  expiryDate?: string;
}

export class AdjustStockDto {
  @ApiProperty()
  @IsNumber()
  quantity!: number;  // positive = add, negative = deduct

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  notes?: string;
}

export class CreatePurchaseOrderItemDto {
  @ApiProperty() @IsUUID()
  itemId!: string;

  @ApiProperty() @IsNumber() @Min(0.01)
  quantity!: number;

  @ApiProperty() @IsNumber() @Min(0)
  unitCost!: number;

  @ApiProperty({ required: false }) @IsOptional() @IsDateString()
  expiryDate?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsUUID()
  supplierId!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray() @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  items!: {
    itemId:      string;
    receivedQty: number;
    expiryDate?: string;
  }[];
}
