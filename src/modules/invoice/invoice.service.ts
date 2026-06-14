import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { InvoiceStatus, PaymentStatus, ShipmentStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dtos/paginated-response.dto';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createInvoice(shipmentId: string, userId: string, amount: number, paymentType: any) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 14); // 14 days due date

    const invoice = await this.prisma.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        amount,
        remaining_amount: amount,
        payment_type: paymentType,
        due_at: dueAt,
        shipmentId,
        userId,
        status: InvoiceStatus.PENDING,
      },
      include: {
        shipment: true,
      },
    });

    // Emit invoice.created event
    this.eventEmitter.emit('invoice.created', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      userId,
      amount,
      dueAt,
    });

    return invoice;
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { shipment: true, payments: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  async getInvoicesByUserId(userId: string, query: PaginationQueryDto) {
    const { page, limit } = query;
    const skip = query.getSkip();

    const where = { userId };
    const [data, totalItems] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: { shipment: true, payments: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async payInvoice(invoiceId: string, dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { shipment: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already paid');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (dto.amount > invoice.remaining_amount) {
      throw new BadRequestException(`Payment amount exceeds remaining balance of ${invoice.remaining_amount}`);
    }

    const isInstallment = dto.paymentType === 'INSTALLMENT';

    // Create the completed payment
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        status: PaymentStatus.COMPLETED,
        method: dto.method,
        transactionId: dto.transactionId,
        installmentNo: isInstallment ? (await this.prisma.payment.count({ where: { invoiceId } })) + 1 : null,
      },
    });

    const newRemaining = invoice.remaining_amount - dto.amount;
    const newStatus = newRemaining <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PENDING;

    // Update invoice
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        remaining_amount: newRemaining,
        status: newStatus,
        payment_type: dto.paymentType,
      },
    });

    // Generate tracking number and update shipment status if not already done
    const shipment = invoice.shipment;
    let finalTrackingNumber = shipment?.tracking_number || null;

    if (shipment && !shipment.tracking_number) {
      const trackingNumber = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
      finalTrackingNumber = trackingNumber;
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          tracking_number: trackingNumber,
          current_status: ShipmentStatus.IN_TRANSIT,
          shipped_at: new Date(),
        },
      });

      // Add shipment timeline entry
      await this.prisma.shipmentTimeline.create({
        data: {
          shipmentId: shipment.id,
          status: ShipmentStatus.IN_TRANSIT,
          notes: 'Shipment paid/installment initiated. Tracking number generated.',
        },
      });
    }

    // Emit invoice.paid event
    this.eventEmitter.emit('invoice.paid', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      userId: invoice.userId,
      amountPaid: dto.amount,
      remainingAmount: newRemaining,
      trackingNumber: finalTrackingNumber,
    });

    return {
      success: true,
      payment,
      invoice: updatedInvoice,
    };
  }

  async generateCorporateMonthlyInvoice(userId: string, year: number, month: number, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role !== 'CORPORATE_PARTNER') {
      throw new BadRequestException(`User is not a Corporate Partner.`);
    }

    // Define start and end date for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch unbilled shipments
    const shipments = await this.prisma.shipment.findMany({
      where: {
        senderId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        corporateInvoiceId: null,
      },
    });

    if (shipments.length === 0) {
      throw new BadRequestException('No unbilled corporate shipments found for this partner in the specified month.');
    }

    const invoiceNumber = `INV-CORP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 14); // 14 days due date

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        amount,
        remaining_amount: amount,
        payment_type: 'FULL',
        due_at: dueAt,
        userId,
        status: InvoiceStatus.PENDING,
      },
    });

    // Update shipments with corporateInvoiceId
    await this.prisma.shipment.updateMany({
      where: {
        id: { in: shipments.map((s) => s.id) },
      },
      data: {
        corporateInvoiceId: invoice.id,
      },
    });

    // Emit invoice.created event (consolidated corporate billing)
    this.eventEmitter.emit('invoice.created', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      userId,
      amount,
      dueAt,
      isCorporate: true,
      shipmentsCount: shipments.length,
      month,
      year,
    });

    return {
      success: true,
      invoice,
      shipmentsCount: shipments.length,
    };
  }
}
