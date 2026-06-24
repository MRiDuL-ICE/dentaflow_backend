import {
  Controller, Get, Post, Patch,
  Body, Param, UseGuards,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation,
  ApiBearerAuth, ApiSecurity,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto, CreatePaymentDto } from './dto/billing.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('billing')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('invoices')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Create invoice' })
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingService.createInvoice(dto, user.id);
  }

  @Get('invoices/overdue')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Get overdue invoices' })
  getOverdue() {
    return this.billingService.getOverdueInvoices();
  }

  @Get('invoices/patient/:patientId')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get all invoices for a patient' })
  getPatientInvoices(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.billingService.getPatientInvoices(patientId);
  }

  @Get('invoices/:id')
  @Roles('clinic_owner', 'dentist', 'receptionist')
  @ApiOperation({ summary: 'Get invoice with items and payments' })
  getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.findOne(id);
  }

  @Patch('invoices/:id/status')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Update invoice status (draft/sent/cancelled)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingService.updateStatus(id, status, user.id);
  }

  @Post('invoices/:id/payments')
  @Roles('clinic_owner', 'receptionist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add payment to invoice' })
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingService.addPayment(id, dto, user.id);
  }
}
