import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpProvider } from 'src/common/providers/smtp.provider';
import { NotificationType, ShipmentStatus } from 'generated/prisma/enums';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly smtpProvider: SmtpProvider,
  ) {}

  // ─────────────────────── Helpers ────────────────────────

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      return user?.email ?? null;
    } catch {
      return null;
    }
  }

  // ─────────────────── Shipment Events ─────────────────────

  @OnEvent('shipment.created')
  async handleShipmentCreated(payload: {
    shipmentId: string;
    senderId: string;
    trackingNumber?: string;
  }) {
    try {
      await this.notificationService.createNotification({
        userId: payload.senderId,
        title: 'Shipment Created',
        message: `Your shipment has been registered successfully.${payload.trackingNumber ? ` Tracking number: ${payload.trackingNumber}` : ''}`,
        type: NotificationType.SHIPMENT,
        metadata: { shipmentId: payload.shipmentId },
      });
    } catch (error) {
      this.logger.error('Failed to create shipment.created notification:', error);
    }
  }

  @OnEvent('shipment.status_updated')
  async handleShipmentStatusUpdated(payload: {
    shipmentId: string;
    senderId: string;
    status: ShipmentStatus;
    notes?: string;
  }) {
    const { shipmentId, senderId, status, notes } = payload;
    try {
      const message = notes || `Your shipment status has been updated to: ${status}`;
      await this.notificationService.createNotification({
        userId: senderId,
        title: `Shipment ${status.replace(/_/g, ' ')}`,
        message,
        type: NotificationType.SHIPMENT,
        metadata: { shipmentId, status },
      });
    } catch (error) {
      this.logger.error('Failed to create shipment.status_updated notification:', error);
    }
  }

  // ─────────────────── Invoice Events ──────────────────────

  @OnEvent('invoice.created')
  async handleInvoiceCreated(payload: {
    invoiceId: string;
    invoiceNumber: string;
    userId: string;
    amount: number;
    dueAt: Date;
    isCorporate?: boolean;
    shipmentsCount?: number;
    month?: number;
    year?: number;
  }) {
    const { invoiceId, invoiceNumber, userId, amount, dueAt, isCorporate, shipmentsCount, month, year } = payload;
    try {
      // In-app notification
      const message = isCorporate
        ? `Monthly consolidated invoice ${invoiceNumber} for ${month}/${year} has been generated. ${shipmentsCount} shipments billed. Total: $${amount.toFixed(2)}`
        : `Invoice ${invoiceNumber} has been issued. Amount: $${amount.toFixed(2)}. Due: ${new Date(dueAt).toLocaleDateString()}`;

      await this.notificationService.createNotification({
        userId,
        title: isCorporate ? 'Monthly Invoice Generated' : 'New Invoice Issued',
        message,
        type: NotificationType.INVOICE,
        metadata: { invoiceId, invoiceNumber },
      });

      // Email notification
      const email = await this.getUserEmail(userId);
      if (email) {
        const subject = isCorporate
          ? `Monthly Consolidated Invoice ${invoiceNumber} — Buan Logistics`
          : `Invoice ${invoiceNumber} issued — Buan Logistics`;

        const html = isCorporate
          ? `<p>Dear Corporate Partner,</p>
             <p>Your monthly consolidated invoice <strong>${invoiceNumber}</strong> for ${month}/${year} has been generated.</p>
             <p><strong>Total Amount:</strong> $${amount.toFixed(2)}</p>
             <p><strong>Total Shipments Billed:</strong> ${shipmentsCount}</p>
             <p><strong>Due Date:</strong> ${new Date(dueAt).toLocaleDateString()}</p>
             <p>Please log in to Buan Logistics to review and pay.</p>
             <p>Thank you for your partnership!</p>`
          : `<p>Dear customer,</p>
             <p>A new invoice <strong>${invoiceNumber}</strong> has been issued for your shipment.</p>
             <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
             <p><strong>Due Date:</strong> ${new Date(dueAt).toLocaleDateString()}</p>
             <p>Please pay via the Buan Logistics platform.</p>
             <p>Thank you for choosing Buan Logistics!</p>`;

        this.smtpProvider.sendMail({ to: email, subject, html }).catch((err) => {
          this.logger.error('Failed to send invoice.created email:', err);
        });
      }
    } catch (error) {
      this.logger.error('Failed to handle invoice.created notification:', error);
    }
  }

  @OnEvent('invoice.paid')
  async handleInvoicePaid(payload: {
    invoiceId: string;
    invoiceNumber: string;
    userId: string;
    amountPaid: number;
    remainingAmount: number;
    trackingNumber?: string;
  }) {
    const { invoiceId, invoiceNumber, userId, amountPaid, remainingAmount, trackingNumber } = payload;
    try {
      const trackingMsg = trackingNumber ? ` Tracking number: ${trackingNumber}` : '';
      const message = `Payment of $${amountPaid.toFixed(2)} received for invoice ${invoiceNumber}. Remaining balance: $${remainingAmount.toFixed(2)}.${trackingMsg}`;

      await this.notificationService.createNotification({
        userId,
        title: 'Payment Confirmed',
        message,
        type: NotificationType.INVOICE,
        metadata: { invoiceId, invoiceNumber, trackingNumber },
      });

      // Email confirmation
      const email = await this.getUserEmail(userId);
      if (email) {
        let trackingHtml = '';
        if (trackingNumber) {
          trackingHtml = `<p>Your shipment is now in transit. <strong>Tracking Number:</strong> ${trackingNumber}</p>
                          <p>You can track your package on the Buan Logistics app.</p>`;
        }

        this.smtpProvider.sendMail({
          to: email,
          subject: `Payment Confirmed — Invoice ${invoiceNumber}`,
          html: `<p>Dear customer,</p>
                 <p>We have received your payment of <strong>$${amountPaid.toFixed(2)}</strong> for invoice <strong>${invoiceNumber}</strong>.</p>
                 <p><strong>Remaining Balance:</strong> $${remainingAmount.toFixed(2)}</p>
                 ${trackingHtml}
                 <p>Thank you for choosing Buan Logistics!</p>`,
        }).catch((err) => {
          this.logger.error('Failed to send invoice.paid email:', err);
        });
      }
    } catch (error) {
      this.logger.error('Failed to handle invoice.paid notification:', error);
    }
  }

  // ───────────────── Application Events ────────────────────

  @OnEvent('user.application_submitted')
  async handleApplicationSubmitted(payload: {
    userId: string;
    applicationType: 'UPGRADE' | 'HUB_PROVIDER' | 'CORPORATE';
    applicationId: string;
  }) {
    const { userId, applicationType } = payload;
    const label = applicationType === 'UPGRADE' ? 'Tier Upgrade' : applicationType === 'CORPORATE' ? 'Corporate Partner' : 'Hub Provider';
    try {
      await this.notificationService.createNotification({
        userId,
        title: `${label} Application Submitted`,
        message: `Your ${label} application has been submitted and is under review. You will be notified once a decision is made.`,
        type: NotificationType.UPGRADE,
        metadata: payload,
      });
    } catch (error) {
      this.logger.error('Failed to create application_submitted notification:', error);
    }
  }

  @OnEvent('user.application_reviewed')
  async handleApplicationReviewed(payload: {
    userId: string;
    applicationType: 'UPGRADE' | 'HUB_PROVIDER' | 'CORPORATE';
    applicationId: string;
    status: string;
    notes?: string;
  }) {
    const { userId, applicationType, status, notes } = payload;
    const label = applicationType === 'UPGRADE' ? 'Tier Upgrade' : applicationType === 'CORPORATE' ? 'Corporate Partner' : 'Hub Provider';
    try {
      const outcome = status === 'Accepted' ? 'approved ✅' : 'rejected ❌';
      const notesMsg = notes ? ` Note: ${notes}` : '';

      await this.notificationService.createNotification({
        userId,
        title: `${label} Application ${status}`,
        message: `Your ${label} application has been ${outcome}.${notesMsg}`,
        type: NotificationType.UPGRADE,
        metadata: payload,
      });
    } catch (error) {
      this.logger.error('Failed to create application_reviewed notification:', error);
    }
  }
}
