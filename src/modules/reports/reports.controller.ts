import { Controller, Get, Param, Query, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Roles } from '@common/rbac/roles.decorator';
import { FastifyReply } from 'fastify';

@ApiTags('reports')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue/pdf')
  @Roles('clinic_owner')
  @ApiOperation({ summary: 'Download revenue report as PDF' })
  async revenueReportPdf(@Query('days') days: number = 30, @Res() res: FastifyReply) {
    const buffer = await this.reportsService.generateRevenueReportPdf(days);
    void res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="revenue-report-${Date.now()}.pdf"`)
      .send(buffer);
  }

  @Get('revenue/csv')
  @Roles('clinic_owner')
  @ApiOperation({ summary: 'Download revenue report as CSV' })
  async revenueReportCsv(@Query('days') days: number = 30, @Res() res: FastifyReply) {
    const csv = await this.reportsService.generateRevenueReportCsv(days);
    void res
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="revenue-${Date.now()}.csv"`)
      .send(csv);
  }

  @Get('patients/csv')
  @Roles('clinic_owner')
  @ApiOperation({ summary: 'Download patient list as CSV' })
  async patientReportCsv(@Res() res: FastifyReply) {
    const csv = await this.reportsService.generatePatientReportCsv();
    void res
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="patients-${Date.now()}.csv"`)
      .send(csv);
  }

  @Get('invoices/csv')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Download invoice report as CSV' })
  async invoiceReportCsv(
    @Query('patientId') patientId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const csv = await this.reportsService.generateInvoiceReportCsv(patientId);
    void res
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="invoices-${Date.now()}.csv"`)
      .send(csv);
  }

  @Get('invoices/:id/pdf')
  @Roles('clinic_owner', 'receptionist')
  @ApiOperation({ summary: 'Download single invoice as PDF' })
  async invoicePdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: FastifyReply) {
    const buffer = await this.reportsService.generateInvoicePdf(id);
    void res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`)
      .send(buffer);
  }
}
