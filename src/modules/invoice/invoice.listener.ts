import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceListener {
  private readonly logger = new Logger(InvoiceListener.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('shipment.created')
  async handleShipmentCreated(payload: {
    shipmentId: string;
    senderId: string;
    cost?: number;
    paymentType?: string;
    autoInvoice?: boolean;
  }) {
    const { shipmentId, senderId, cost, paymentType, autoInvoice } = payload;
    if (!autoInvoice || cost === undefined || !paymentType) {
      return;
    }

    try {
      this.logger.log(`Auto-creating invoice for created shipment ${shipmentId}`);
      await this.invoiceService.createInvoice(shipmentId, senderId, cost, paymentType);
    } catch (error) {
      this.logger.error(`Failed to auto-create invoice for shipment ${shipmentId}:`, error);
    }
  }

  @OnEvent('shipment.arrived')
  async handleShipmentArrived(payload: {
    shipmentId: string;
    senderId: string;
    cost: number;
    hubId?: string;
  }) {
    const { shipmentId, senderId, cost, hubId } = payload;

    try {
      this.logger.log(`Processing shipment arrived at branch: ${shipmentId}`);

      // 1. Auto-create HubCommission if shipment originated from a hub
      if (hubId) {
        const hub = await this.prisma.hub.findUnique({
          where: { id: hubId },
        });

        if (hub && hub.commissionPerPackage > 0) {
          const existingCommission = await this.prisma.hubCommission.findUnique({
            where: { shipmentId },
          });

          if (!existingCommission) {
            await this.prisma.hubCommission.create({
              data: {
                hubId: hub.id,
                shipmentId,
                amount: hub.commissionPerPackage,
              },
            });
            this.logger.log(`Hub commission of $${hub.commissionPerPackage} registered for hub ${hubId}`);
          }
        }
      }

      // 2. Generate Invoice for the T1 regular user
      await this.invoiceService.createInvoice(shipmentId, senderId, cost, 'FULL');
    } catch (error) {
      this.logger.error(`Failed to process shipment arrival for shipment ${shipmentId}:`, error);
    }
  }
}
