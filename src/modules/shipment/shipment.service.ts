import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateT1ShipmentDto } from './dtos/create-t1-shipment.dto';
import { CreateT2T3ShipmentDto } from './dtos/create-t2t3-shipment.dto';
import { CreateCorporateShipmentDto } from './dtos/create-corporate-shipment.dto';
import { CreateContainerDto } from './dtos/create-container.dto';
import { PasswordHasher } from '../authentication/utils/PasswordHasher';
import { ShipmentStatus, ShipmentType, Tier, Role, ContainerType, ContainerStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dtos/paginated-response.dto';
import { SmtpProvider } from 'src/common/providers/smtp.provider';

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
    private readonly eventEmitter: EventEmitter2,
    private readonly smtpProvider: SmtpProvider,
  ) {}

  async createT1Shipment(dto: CreateT1ShipmentDto) {
    // 1. Search sender by email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.senderEmail },
      include: { profile: true },
    });

    let userId: string;
    let isNewUser = false;
    let generatedPassword = '';

    if (existingUser) {
      if (existingUser.tier === Tier.T3 || existingUser.role === Role.CORPORATE_PARTNER) {
        throw new BadRequestException('Container (T3) and Corporate users cannot use hubs. Please go to a branch directly.');
      }
      userId = existingUser.id;
    } else {
      // 2. If not found, create new user with a random password
      isNewUser = true;
      // Generate a random 10-character password
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let randomPass = '';
      for (let i = 0; i < 10; i++) {
        randomPass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      generatedPassword = randomPass;
      const hashedPassword = await this.passwordHasher.hashPassword(generatedPassword);

      const newUser = await this.prisma.user.create({
        data: {
          email: dto.senderEmail,
          password: hashedPassword,
          provider: 'local',
          role: Role.USER,
          tier: Tier.T1,
          profile: {
            create: {
              firstName: dto.senderFirstName,
              lastName: dto.senderLastName,
              phone: dto.senderPhone,
            },
          },
        },
      });
      userId = newUser.id;
    }

    // 3. Create shipment
    const shipment = await this.prisma.shipment.create({
      data: {
        senderId: userId,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        receiverAddress: dto.receiverAddress,
        weight: dto.weight,
        hubId: dto.hubId,
        current_status: ShipmentStatus.AT_HUB,
        type: ShipmentType.STANDARD,
        // Pickup scheduling ("send for someone else" feature)
        pickupContactName: dto.pickupContactName,
        pickupContactPhone: dto.pickupContactPhone,
        pickupAddress: dto.pickupAddress,
        scheduledPickupDate: dto.scheduledPickupDate ? new Date(dto.scheduledPickupDate) : undefined,
      },
    });

    // 4. Add timeline entry
    await this.prisma.shipmentTimeline.create({
      data: {
        shipmentId: shipment.id,
        status: ShipmentStatus.AT_HUB,
        notes: dto.pickupContactName
          ? `Parcel received at Hub. Pickup scheduled for ${dto.pickupContactName} on ${dto.scheduledPickupDate ?? 'TBD'}.`
          : 'Parcel received at Hub.',
      },
    });

    // Send Emails
    try {
      if (isNewUser) {
        // Send email 1: Credentials
        await this.smtpProvider.sendMail({
          to: dto.senderEmail,
          subject: 'Welcome to Buan Logistics - Account Created',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #1a73e8; text-align: center;">Welcome to Buan Logistics</h2>
              <p>Hello <strong>${dto.senderFirstName} ${dto.senderLastName}</strong>,</p>
              <p>An account has been automatically created for you in our system following your shipment registration.</p>
              <p>Here are your temporary login details:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8f9fa; border-radius: 5px;">
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #dee2e6;">Email:</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${dto.senderEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; border: 1px solid #dee2e6;">Temporary Password:</td>
                  <td style="padding: 10px; border: 1px solid #dee2e6; color: #d93025; font-family: monospace; font-size: 16px;">${generatedPassword}</td>
                </tr>
              </table>
              <p>Please log in and update your password immediately for security reasons.</p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
              <p style="color: #5f6368; font-size: 12px;">Buan Logistics API Service</p>
            </div>
          `,
        });

        // Send email 2: Shipment details
        await this.smtpProvider.sendMail({
          to: dto.senderEmail,
          subject: 'Buan Logistics - New Shipment Registered',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #1a73e8; text-align: center;">Shipment Registered Successfully</h2>
              <p>Hello <strong>${dto.senderFirstName} ${dto.senderLastName}</strong>,</p>
              <p>Your shipment has been registered and is currently <strong>AT HUB</strong>.</p>
              <h3 style="color: #1a73e8; margin-top: 20px;">Shipment Information</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Shipment ID:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${shipment.id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Receiver Name:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${dto.receiverName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Receiver Address:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${dto.receiverAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Weight:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${dto.weight} kg</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
              <p style="color: #5f6368; font-size: 12px;">Buan Logistics API Service</p>
            </div>
          `,
        });
      } else {
        // Send single email: Shipment details for existing user
        await this.smtpProvider.sendMail({
          to: dto.senderEmail,
          subject: 'Buan Logistics - New Shipment Registered',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #1a73e8; text-align: center;">Shipment Registered Successfully</h2>
              <p>Hello <strong>${existingUser!.profile?.firstName || ''} ${existingUser!.profile?.lastName || ''}</strong>,</p>
              <p>A new shipment has been registered to your Buan Logistics account and is currently <strong>AT HUB</strong>.</p>
              <h3 style="color: #1a73e8; margin-top: 20px;">Shipment Information</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Shipment ID:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${shipment.id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Receiver Name:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${dto.receiverName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Receiver Address:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${dto.receiverAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Weight:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${dto.weight} kg</td>
                </tr>
              </table>
              <p>You can manage and track this shipment by logging into your dashboard.</p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
              <p style="color: #5f6368; font-size: 12px;">Buan Logistics API Service</p>
            </div>
          `,
        });
      }
    } catch (err) {
      this.logger.error('Failed to send shipment creation emails:', err);
    }

    // Emit shipment.created event
    this.eventEmitter.emit('shipment.created', {
      shipmentId: shipment.id,
      senderId: shipment.senderId,
      trackingNumber: shipment.tracking_number,
    });

    return shipment;
  }

  async createT2T3Shipment(dto: CreateT2T3ShipmentDto) {
    const sender = await this.prisma.user.findUnique({
      where: { id: dto.senderId },
    });

    if (!sender) {
      throw new NotFoundException(`Sender user with ID ${dto.senderId} not found`);
    }

    if (sender.tier === Tier.T1) {
      throw new BadRequestException('Regular customer (T1) cannot book T2/T3 shipments directly. Use hub provider entry.');
    }

    if (sender.tier === Tier.T3 && !dto.containerDetails) {
      throw new BadRequestException('T3 Premium customers must provide full container details.');
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        senderId: dto.senderId,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        receiverAddress: dto.receiverAddress,
        weight: dto.weight,
        description: dto.description,
        cost: dto.cost,
        packageDetails: dto.packageDetails || {},
        containerDetails: dto.containerDetails || {},
        branchId: dto.branchId,
        current_status: ShipmentStatus.PENDING,
        type: dto.type,
        // Pickup scheduling ("send for someone else" feature)
        pickupContactName: dto.pickupContactName,
        pickupContactPhone: dto.pickupContactPhone,
        pickupAddress: dto.pickupAddress,
        scheduledPickupDate: dto.scheduledPickupDate ? new Date(dto.scheduledPickupDate) : undefined,
      },
    });

    // Add timeline
    await this.prisma.shipmentTimeline.create({
      data: {
        shipmentId: shipment.id,
        status: ShipmentStatus.PENDING,
        notes: 'Shipment created at branch. Awaiting payment.',
      },
    });

    const paymentType = sender.tier === Tier.T2 || sender.tier === Tier.T3 ? 'INSTALLMENT' : 'FULL';

    // Emit shipment.created event with billing instructions
    this.eventEmitter.emit('shipment.created', {
      shipmentId: shipment.id,
      senderId: sender.id,
      cost: dto.cost,
      paymentType,
      autoInvoice: true,
    });

    return shipment;
  }

  async createCorporateShipment(dto: CreateCorporateShipmentDto) {
    const sender = await this.prisma.user.findUnique({
      where: { id: dto.senderId },
    });

    if (!sender) {
      throw new NotFoundException(`Sender user with ID ${dto.senderId} not found`);
    }

    if (sender.role !== Role.CORPORATE_PARTNER) {
      throw new BadRequestException('Only corporate partners can create corporate shipments.');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
    }

    const trackingNumber = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const shipment = await this.prisma.shipment.create({
      data: {
        senderId: dto.senderId,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        receiverAddress: dto.receiverAddress,
        weight: dto.weight,
        description: dto.description,
        cost: 0.0,
        packageDetails: dto.packageDetails || {},
        branchId: dto.branchId,
        current_status: ShipmentStatus.PENDING,
        tracking_number: trackingNumber,
        type: dto.type,
      },
    });

    // Add timeline
    await this.prisma.shipmentTimeline.create({
      data: {
        shipmentId: shipment.id,
        status: ShipmentStatus.PENDING,
        notes: 'Corporate shipment registered. Awaiting monthly billing.',
      },
    });

    // Emit shipment.created event
    this.eventEmitter.emit('shipment.created', {
      shipmentId: shipment.id,
      senderId: shipment.senderId,
      trackingNumber: shipment.tracking_number,
    });

    return shipment;
  }

  async pickupFromHub(shipmentId: string, photoUrls: string[] = []) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { current_status: ShipmentStatus.PICKED },
    });

    await this.prisma.shipmentTimeline.create({
      data: {
        shipmentId,
        status: ShipmentStatus.PICKED,
        notes: 'Parcel picked up from hub by truck.',
        photo_urls: photoUrls,
      },
    });

    // Emit status update event
    this.eventEmitter.emit('shipment.status_updated', {
      shipmentId,
      senderId: shipment.senderId,
      status: ShipmentStatus.PICKED,
      notes: 'Parcel picked up from hub by truck.',
    });

    return updated;
  }

  async arriveAtBranch(shipmentId: string, cost: number, branchId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        current_status: ShipmentStatus.ARRIVED_AT_BRANCH,
        cost,
        branchId,
      },
    });

    await this.prisma.shipmentTimeline.create({
      data: {
        shipmentId,
        status: ShipmentStatus.ARRIVED_AT_BRANCH,
        notes: `Parcel arrived at branch. Cost calculated: $${cost}. Invoice generated.`,
      },
    });

    // Emit shipment.arrived event to handle invoicing and hub commission asynchronously
    this.eventEmitter.emit('shipment.arrived', {
      shipmentId,
      senderId: shipment.senderId,
      cost,
      hubId: shipment.hubId,
    });

    return updated;
  }

  async updateStatus(shipmentId: string, status: ShipmentStatus, notes?: string, photoUrls: string[] = []) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    const data: any = { current_status: status };
    if (status === ShipmentStatus.DELIVERED) {
      data.delivered_at = new Date();
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data,
    });

    await this.prisma.shipmentTimeline.create({
      data: {
        shipmentId,
        status,
        notes: notes || `Shipment status updated to ${status}`,
        photo_urls: photoUrls,
      },
    });

    // Emit status update event
    this.eventEmitter.emit('shipment.status_updated', {
      shipmentId,
      senderId: shipment.senderId,
      status,
      notes,
    });

    return updated;
  }

  async getHubParcelsSummary() {
    const counts = await this.prisma.shipment.groupBy({
      by: ['hubId'],
      _count: { id: true },
      where: {
        current_status: ShipmentStatus.AT_HUB,
      },
    });

    // Extract non-null hub IDs
    const hubIds = counts.map((item) => item.hubId).filter(Boolean) as string[];

    // Fetch all hubs in a single query
    const hubs = await this.prisma.hub.findMany({
      where: { id: { in: hubIds } },
      select: { id: true, name: true },
    });

    const hubMap = new Map(hubs.map((hub) => [hub.id, hub.name]));

    const summary = counts.map((item) => {
      if (!item.hubId) return null;
      return {
        hubId: item.hubId,
        hubName: hubMap.get(item.hubId) || 'Unknown Hub',
        parcelCount: item._count.id,
      };
    });

    return summary.filter(Boolean);
  }

  async trackShipment(trackingNumber: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { tracking_number: trackingNumber },
      include: {
        timeline: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with tracking number ${trackingNumber} not found`);
    }

    return shipment;
  }

  async getMyShipments(userId: string, query: PaginationQueryDto) {
    const { page, limit } = query;
    const skip = query.getSkip();

    const where = { senderId: userId };
    const [data, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: { timeline: true, invoices: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async createContainer(dto: CreateContainerDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
    }

    return this.prisma.container.create({
      data: dto,
    });
  }

  async assignShipmentToContainer(shipmentId: string, containerId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
    });
    if (!container) {
      throw new NotFoundException(`Container with ID ${containerId} not found`);
    }

    const updatedShipment = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { containerId },
    });

    if (container.type === ContainerType.CONSOLIDATED) {
      // Consolidated shipments share the container number as tracking number
      await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: { tracking_number: container.containerNumber },
      });
    }

    return updatedShipment;
  }

  async updateContainerStatus(containerId: string, status: ContainerStatus) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
      include: { shipments: true },
    });
    if (!container) {
      throw new NotFoundException(`Container with ID ${containerId} not found`);
    }

    const updatedContainer = await this.prisma.container.update({
      where: { id: containerId },
      data: { status },
    });

    if (container.type === ContainerType.CONSOLIDATED && (status === ContainerStatus.SEALED || status === ContainerStatus.IN_TRANSIT)) {
      await this.prisma.shipment.updateMany({
        where: { containerId },
        data: { tracking_number: container.containerNumber },
      });

      for (const shipment of container.shipments) {
        await this.prisma.shipmentTimeline.create({
          data: {
            shipmentId: shipment.id,
            status: ShipmentStatus.IN_TRANSIT,
            notes: `Container ${container.containerNumber} status updated to ${status}. Consolidated tracking number active.`,
          },
        });

        if (status === ContainerStatus.IN_TRANSIT) {
          await this.prisma.shipment.update({
            where: { id: shipment.id },
            data: { current_status: ShipmentStatus.IN_TRANSIT },
          });

          this.eventEmitter.emit('shipment.status_updated', {
            shipmentId: shipment.id,
            senderId: shipment.senderId,
            status: ShipmentStatus.IN_TRANSIT,
            notes: `Container ${container.containerNumber} status updated to ${status}.`,
          });
        }
      }
    }

    return updatedContainer;
  }

  async getContainerById(id: string) {
    const container = await this.prisma.container.findUnique({
      where: { id },
      include: { shipments: true, branch: true },
    });
    if (!container) {
      throw new NotFoundException(`Container with ID ${id} not found`);
    }
    return container;
  }
}
