import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { GenerateCorporateInvoiceDto } from './dtos/generate-corporate-invoice.dto';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { GetInvoicesByBranchIdDto } from './dtos/get-invoices-by-branchid';

@ApiTags('Invoices & Payments')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get invoices of the logged-in user (paginated, supports search and filters)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by invoice number' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by invoice status' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter createdAt on or after this date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter createdAt on or before this date' })
  async getMyInvoices(@Request() req: any, @Query() query: PaginationQueryDto) {
    const userId = req.payload.userId;
    return this.invoiceService.getInvoicesByUserId(userId, query);
  }

  @Post('corporate/generate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiOperation({ summary: 'Generate periodic monthly invoice for a corporate partner (Admin/Branch staff only)' })
  async generateCorporateInvoice(@Body() dto: GenerateCorporateInvoiceDto) {
    return this.invoiceService.generateCorporateMonthlyInvoice(
      dto.userId,
      dto.year,
      dto.month,
      dto.amount,
    );
  }



  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all invoices (Admin only, paginated, supports search and filters)' })
  async getAllInvoices(@Query() query: PaginationQueryDto) {
    return this.invoiceService.getAllInvoices(query);
  }

  @Get("branch")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiOperation({ summary: 'Get invoices for the logged-in branch (paginated, supports search and filters)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by invoice number' })
  @ApiBody({type: GetInvoicesByBranchIdDto, description: 'Branch ID to filter invoices'})
  async getBranchInvoices(@Request() req: any, @Query() query: PaginationQueryDto) {
    const branchId = req.payload.branchId;
    return this.invoiceService.getBranchInvoices(branchId, query);
  }

  
  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoiceById(@Param('id') id: string) {
    return this.invoiceService.getInvoiceById(id);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pay an invoice (Full or Installment)' })
  async payInvoice(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.invoiceService.payInvoice(id, dto);
  }
}
