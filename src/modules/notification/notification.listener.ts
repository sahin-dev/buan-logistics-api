import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpProvider } from 'src/common/providers/smtp.provider';
import { NotificationType, ShipmentStatus, Role } from 'generated/prisma/enums';

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

  /**
   * Get all admin users for system-wide notifications
   */
  private async getAllAdmins(): Promise<string[]> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });
      return admins.map((admin) => admin.id);
    } catch (error) {
      this.logger.error('Failed to fetch admin users:', error);
      return [];
    }
  }

  /**
   * Create notification for each admin user
   */
  private async notifyAdmins(
    title: string,
    message: string,
    type: NotificationType,
    metadata?: any,
  ): Promise<void> {
    try {
      const adminIds = await this.getAllAdmins();
      for (const adminId of adminIds) {
        await this.notificationService.createNotification({
          userId: adminId,
          title,
          message,
          type,
          metadata,
        });
      }
    } catch (error) {
      this.logger.error('Failed to notify admins:', error);
    }
  }

  // ─────────────────── User Events ──────────────────────

  @OnEvent('user.registered')
  async handleUserRegistered(payload: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    try {
      const { userId, email, firstName, lastName } = payload;
      const userName = firstName && lastName ? `${firstName} ${lastName}` : email;

      // Admin notification
      await this.notifyAdmins(
        'New User Registered',
        `New user ${userName} (${email}) has registered on the platform.`,
        NotificationType.SYSTEM,
        { userId, email, userName },
      );

      this.logger.log(`Admin notified of new user registration: ${email}`);
    } catch (error) {
      this.logger.error('Failed to handle user.registered notification:', error);
    }
  }

  // ─────────────────── Shipment Events ─────────────────────

  @OnEvent('shipment.created')
  async handleShipmentCreated(payload: {
    shipmentId: string;
    senderId: string;
    trackingNumber?: string;
    shipment_number?: string;
    receiverName?: string;
  }) {
    try {
      // Customer notification
      await this.notificationService.createNotification({
        userId: payload.senderId,
        title: 'Shipment Created',
        message: `Your shipment has been registered successfully.${payload.trackingNumber ? ` Tracking number: ${payload.trackingNumber}` : ''}`,
        type: NotificationType.SHIPMENT,
        metadata: { shipmentId: payload.shipmentId },
      });

      // Get sender details for admin notification
      const sender = await this.prisma.user.findUnique({
        where: { id: payload.senderId },
        select: { email: true, profile: true },
      });

      const senderName = sender?.profile
        ? `${sender.profile.firstName} ${sender.profile.lastName}`
        : sender?.email || 'Unknown User';

      // Admin notification
      await this.notifyAdmins(
        'New Shipment Created',
        `New shipment ${payload.shipment_number || payload.shipmentId} created by ${senderName} to ${payload.receiverName || 'receiver'}. Tracking: ${payload.trackingNumber || 'pending'}`,
        NotificationType.SHIPMENT,
        { shipmentId: payload.shipmentId, senderEmail: sender?.email, shipment_number: payload.shipment_number },
      );

      this.logger.log(`Admin notified of new shipment: ${payload.shipmentId}`);
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

      // User notification
      await this.notificationService.createNotification({
        userId,
        title: 'Payment Confirmed',
        message,
        type: NotificationType.INVOICE,
        metadata: { invoiceId, invoiceNumber, trackingNumber },
      });

      // Get user details for admin notification
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, profile: true },
      });

      const userName = user?.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : user?.email || 'Unknown User';

      // Admin notification for payments (especially large ones)
      if (amountPaid >= 100) {
        // Notify admins of payments $100 or more
        await this.notifyAdmins(
          'New Payment Received',
          `Payment of $${amountPaid.toFixed(2)} received from ${userName} (${user?.email}) for invoice ${invoiceNumber}.`,
          NotificationType.INVOICE,
          { invoiceId, invoiceNumber, amountPaid, userName, userEmail: user?.email },
        );
      }

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
      // User notification
      await this.notificationService.createNotification({
        userId,
        title: `${label} Application Submitted`,
        message: `Your ${label} application has been submitted and is under review. You will be notified once a decision is made.`,
        type: NotificationType.UPGRADE,
        metadata: payload,
      });

      // Get user details for admin notification
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, profile: true },
      });

      const userName = user?.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : user?.email || 'Unknown User';

      // Admin notification
      await this.notifyAdmins(
        `New ${label} Application Submitted`,
        `User ${userName} (${user?.email}) has submitted a ${label} application for review.`,
        NotificationType.UPGRADE,
        { userId, applicationType, applicationId: payload.applicationId, userName, userEmail: user?.email },
      );

      this.logger.log(`Admin notified of ${applicationType} application submission from ${user?.email}`);
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

      // User notification
      await this.notificationService.createNotification({
        userId,
        title: `${label} Application ${status}`,
        message: `Your ${label} application has been ${outcome}.${notesMsg}`,
        type: NotificationType.UPGRADE,
        metadata: payload,
      });

      // Get user details for audit log
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, profile: true },
      });

      const userName = user?.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : user?.email || 'Unknown User';

      // Create broadcast notification for admins (audit trail)
      await this.notifyAdmins(
        `${label} Application ${status}`,
        `Application review completed: ${userName} (${user?.email}) application has been ${outcome}.${notesMsg}`,
        NotificationType.SYSTEM,
        { userId, applicationType, status, userName, userEmail: user?.email },
      );

      this.logger.log(`Admin notified of ${applicationType} application review for ${user?.email}`);
    } catch (error) {
      this.logger.error('Failed to create application_reviewed notification:', error);
    }
  }
}
