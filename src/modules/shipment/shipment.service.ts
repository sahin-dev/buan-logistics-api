import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateT1ShipmentDto } from './dtos/create-t1-shipment.dto';
import { CreateT2T3ShipmentDto } from './dtos/create-t2t3-shipment.dto';
import { CreateCorporateShipmentDto } from './dtos/create-corporate-shipment.dto';
import { CreateContainerDto } from './dtos/create-container.dto';
import { CreateShipmentFromIntakeDto } from './dtos/create-shipment-from-intake.dto';
import { PasswordHasher } from '../authentication/utils/PasswordHasher';
import { ShipmentStatus, ShipmentType, Tier, Role, ContainerType, ContainerStatus, IntakeParcelStatus } from 'generated/prisma/enums';
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

  private async generateUniqueShipmentNumber(): Promise<string> {
    const year = new Date().getFullYear();

    while (true) {
      const suffix = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
      const shipmentNumber = `BN-${year}-${suffix}`;
      const existing = await this.prisma.shipment.findUnique({
        where: { shipment_number: shipmentNumber },
      });

      if (!existing) {
        return shipmentNumber;
      }
    }
  }

  private async generateUniqueReferralCode(): Promise<string> {
    while (true) {
      const suffix = Math.floor(100000 + Math.random() * 900000).toString();
      const referralCode = `REF${suffix}`;
      const existing = await this.prisma.user.findUnique({
        where: { referralCode },
      });

      if (!existing) {
        return referralCode;
      }
    }
  }

  private async getBranchIdForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { branchId: true },
    });

    if (!user?.branchId) {
      throw new BadRequestException('No branch is assigned to this branch user.');
    }

    return user.branchId;
  }

  private async getOrCreateT1Sender(dto: {
    senderEmail: string;
    senderFirstName: string;
    senderLastName: string;
    senderPhone: string;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.senderEmail },
      include: { profile: true },
    });

    if (existingUser) {
      if (existingUser.tier === Tier.T3 || existingUser.role === Role.CORPORATE_PARTNER) {
        throw new BadRequestException('Container (T3) and Corporate users cannot use hub intake shipments.');
      }

      return { userId: existingUser.id, isNewUser: false, generatedPassword: '', existingUser };
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let generatedPassword = '';
    for (let i = 0; i < 10; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hashedPassword = await this.passwordHasher.hashPassword(generatedPassword);
    const referralCode = await this.generateUniqueReferralCode();
    const newUser = await this.prisma.user.create({
      data: {
        email: dto.senderEmail,
        password: hashedPassword,
        provider: 'local',
        role: Role.USER,
        tier: Tier.T1,
        referralCode,
        profile: {
          create: {
            firstName: dto.senderFirstName,
            lastName: dto.senderLastName,
            phone: dto.senderPhone,
          },
        },
      },
      include: { profile: true },
    });

    return { userId: newUser.id, isNewUser: true, generatedPassword, existingUser: newUser };
  }

  private async validateDeliveryHub(deliveryHubId: string, branchId: string) {
    const deliveryHub = await this.prisma.hub.findUnique({
      where: { id: deliveryHubId },
    });

    if (!deliveryHub) {
      throw new NotFoundException(`Delivery hub with ID ${deliveryHubId} not found`);
    }

    if (deliveryHub.branchId !== branchId) {
      throw new BadRequestException('Delivery hub must belong to the assigned branch.');
    }

    return deliveryHub;
  }

  private async markBranchHasNewShipment(branchId?: string | null) {
    if (!branchId) return;

    await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        new_shipment: true,
        new_shipment_count: { increment: 1 },
      },
    });
  }

  private async resetBranchNewShipmentCounter(branchId: string) {
    await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        new_shipment: false,
        new_shipment_count: 0,
      },
    });
  }

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
      const referralCode = await this.generateUniqueReferralCode();

      const newUser = await this.prisma.user.create({
        data: {
          email: dto.senderEmail,
          password: hashedPassword,
          provider: 'local',
          role: Role.USER,
          tier: Tier.T1,
          referralCode,
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

    const shipmentNumber = await this.generateUniqueShipmentNumber();

    // 3. Create shipment
    const shipment = await this.prisma.shipment.create({
      data: {
        shipment_number: shipmentNumber,
        senderId: userId,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        receiverAddress: dto.receiverAddress,
        weight: dto.weight,
        hubId: dto.hubId,
        originHubId: dto.hubId,
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
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Shipment Number:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${shipmentNumber}</td>
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
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Shipment Number:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${shipmentNumber}</td>
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
      shipment_number: shipment.shipment_number,
      receiverName: shipment.receiverName,
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

    const shipmentNumber = await this.generateUniqueShipmentNumber();

    const shipment = await this.prisma.shipment.create({
      data: {
        shipment_number: shipmentNumber,
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

    await this.markBranchHasNewShipment(dto.branchId);

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
      trackingNumber: shipment.tracking_number,
      shipment_number: shipment.shipment_number,
      receiverName: shipment.receiverName,
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
    const shipmentNumber = await this.generateUniqueShipmentNumber();

    const shipment = await this.prisma.shipment.create({
      data: {
        shipment_number: shipmentNumber,
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

    await this.markBranchHasNewShipment(dto.branchId);

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
      shipment_number: shipment.shipment_number,
      receiverName: shipment.receiverName,
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

    if (shipment.branchId !== branchId || shipment.current_status !== ShipmentStatus.ARRIVED_AT_BRANCH) {
      await this.markBranchHasNewShipment(branchId);
    }

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

  async createFromIntakeParcel(intakeParcelId: string, dto: CreateShipmentFromIntakeDto, branchUserId: string) {
    const branchId = await this.getBranchIdForUser(branchUserId);

    const intakeParcel = await this.prisma.intakeParcel.findUnique({
      where: { id: intakeParcelId },
      include: { hub: true },
    });

    if (!intakeParcel) {
      throw new NotFoundException(`Intake parcel with ID ${intakeParcelId} not found`);
    }

    if (intakeParcel.hub.branchId !== branchId) {
      throw new BadRequestException('This intake parcel does not belong to your branch.');
    }

    if (intakeParcel.status !== IntakeParcelStatus.HANDED_OVER) {
      throw new BadRequestException('Only handed over intake parcels can be converted to shipments.');
    }

    if (dto.deliveryHubId) {
      await this.validateDeliveryHub(dto.deliveryHubId, branchId);
    }

    const sender = await this.getOrCreateT1Sender(dto);
    const shipmentNumber = await this.generateUniqueShipmentNumber();
    const cost = dto.cost ?? 0.0;

    const shipment = await this.prisma.$transaction(async (tx) => {
      await tx.intakeParcel.update({
        where: { id: intakeParcelId },
        data: {
          status: IntakeParcelStatus.ARRIVED_AT_BRANCH,
          arrivedAt: intakeParcel.arrivedAt ?? new Date(),
        },
      });

      const createdShipment = await tx.shipment.create({
        data: {
          shipment_number: shipmentNumber,
          senderId: sender.userId,
          receiverName: intakeParcel.full_name,
          receiverPhone: intakeParcel.phone,
          receiverAddress: intakeParcel.address,
          weight: dto.weight,
          description: intakeParcel.package_info,
          packageDetails: dto.packageDetails || {},
          cost,
          hubId: intakeParcel.hubId,
          originHubId: intakeParcel.hubId,
          branchId,
          deliveryHubId: dto.deliveryHubId,
          current_status: ShipmentStatus.ARRIVED_AT_BRANCH,
          type: dto.type ?? ShipmentType.STANDARD,
          shipmentType: dto.shipmentType,
        },
      });

      await tx.shipmentTimeline.create({
        data: {
          shipmentId: createdShipment.id,
          status: ShipmentStatus.ARRIVED_AT_BRANCH,
          notes: 'Shipment created from intake parcel after arriving at branch.',
          photo_urls: intakeParcel.image_urls,
        },
      });

      return createdShipment;
    });

    this.eventEmitter.emit('shipment.created', {
      shipmentId: shipment.id,
      senderId: shipment.senderId,
      trackingNumber: shipment.tracking_number,
      shipment_number: shipment.shipment_number,
      receiverName: shipment.receiverName,
    });

    await this.markBranchHasNewShipment(branchId);

    if (cost > 0) {
      this.eventEmitter.emit('shipment.arrived', {
        shipmentId: shipment.id,
        senderId: shipment.senderId,
        cost,
        hubId: shipment.originHubId,
      });
    }

    return shipment;
  }

  async assignDeliveryHub(shipmentId: string, deliveryHubId: string, branchUserId: string) {
    const branchId = await this.getBranchIdForUser(branchUserId);
    await this.validateDeliveryHub(deliveryHubId, branchId);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    if (shipment.branchId !== branchId) {
      throw new BadRequestException('This shipment does not belong to your branch.');
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        deliveryHubId,
        current_status: ShipmentStatus.OUT_OF_DELIVERY,
      },
    });

    await this.prisma.shipmentTimeline.create({
      data: {
        shipmentId,
        status: ShipmentStatus.OUT_OF_DELIVERY,
        notes: 'Shipment assigned to delivery hub.',
      },
    });

    this.eventEmitter.emit('shipment.status_updated', {
      shipmentId,
      senderId: shipment.senderId,
      status: ShipmentStatus.OUT_OF_DELIVERY,
      notes: 'Shipment assigned to delivery hub.',
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
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        OR: [
          { tracking_number: trackingNumber },
          { shipment_number: trackingNumber },
        ],
      },
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
    const { page, limit, search, status, shipmentType, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      senderId: userId,
      ...(search ? {
        OR: [
          { receiverName: { contains: search, mode: 'insensitive' } },
          { receiverAddress: { contains: search, mode: 'insensitive' } },
          { tracking_number: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(status ? { current_status: status } : {}),
      ...(shipmentType ? { shipmentType } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };
    const [data, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: {
          timeline: { orderBy: { timestamp: 'asc' } },
          invoices: true,
          rewards: true,
          branch: true,
          hub: true,
          originHub: true,
          deliveryHub: true,
          sender: { include: { profile: true } },
          container: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getAllShipmentsForAdmin(query: PaginationQueryDto) {
    const { page, limit, search, status, shipmentType, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      ...(search ? {
        OR: [
          { receiverName: { contains: search, mode: 'insensitive' } },
          { receiverAddress: { contains: search, mode: 'insensitive' } },
          { shipment_number: { contains: search, mode: 'insensitive' } },
          { tracking_number: { contains: search, mode: 'insensitive' } },
          { sender: { email: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
      ...(status ? { current_status: status } : {}),
      ...(shipmentType ? { shipmentType } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: {
          timeline: { orderBy: { timestamp: 'asc' } },
          invoices: true,
          rewards: true,
          branch: true,
          hub: true,
          originHub: true,
          deliveryHub: true,
          sender: { include: { profile: true } },
          container: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getShipmentsByBranchIdForAdmin(branchId: string, query: PaginationQueryDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const { page, limit, search, status, shipmentType, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      branchId,
      ...(search ? {
        OR: [
          { receiverName: { contains: search, mode: 'insensitive' } },
          { receiverAddress: { contains: search, mode: 'insensitive' } },
          { shipment_number: { contains: search, mode: 'insensitive' } },
          { tracking_number: { contains: search, mode: 'insensitive' } },
          { sender: { email: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
      ...(status ? { current_status: status } : {}),
      ...(shipmentType ? { shipmentType } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: {
          timeline: { orderBy: { timestamp: 'asc' } },
          invoices: true,
          rewards: true,
          branch: true,
          hub: true,
          originHub: true,
          deliveryHub: true,
          sender: { include: { profile: true } },
          container: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    await this.resetBranchNewShipmentCounter(branchId);

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

  async getShipmentById(shipmentId: string) {
    try {
      const shipment = await this.prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          timeline: { orderBy: { timestamp: 'asc' } },
          invoices: true,
          rewards: true,
          branch: true,
          hub: true,
          originHub: true,
          deliveryHub: true,
          sender: { include: { profile: true } },
          container: true,
        },
      });

      if (!shipment) {
        throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
      }

      return shipment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching shipment ${shipmentId}:`, error);
      throw error;
    }
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

  async getBranchIncomingShipments(userId: string, query: PaginationQueryDto) {
    const branchId = await this.getBranchIdForUser(userId);
    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      branchId,
      current_status: status ?? ShipmentStatus.ARRIVED_AT_BRANCH,
      ...(search ? {
        OR: [
          { receiverName: { contains: search, mode: 'insensitive' } },
          { receiverPhone: { contains: search, mode: 'insensitive' } },
          { receiverAddress: { contains: search, mode: 'insensitive' } },
          { shipment_number: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: { sender: { include: { profile: true } }, originHub: true, deliveryHub: true, branch: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    await this.resetBranchNewShipmentCounter(branchId);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getBranchOutgoingShipments(userId: string, query: PaginationQueryDto) {
    const branchId = await this.getBranchIdForUser(userId);
    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      branchId,
      deliveryHubId: { not: null },
      ...(status ? { current_status: status } : {}),
      ...(search ? {
        OR: [
          { receiverName: { contains: search, mode: 'insensitive' } },
          { receiverPhone: { contains: search, mode: 'insensitive' } },
          { receiverAddress: { contains: search, mode: 'insensitive' } },
          { shipment_number: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: { sender: { include: { profile: true } }, originHub: true, deliveryHub: true, branch: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    await this.resetBranchNewShipmentCounter(branchId);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getDeliveryHubIncomingShipments(userId: string, query: PaginationQueryDto) {
    const hub = await this.prisma.hub.findFirst({ where: { hubProviderId: userId } });
    if (!hub) {
      throw new NotFoundException('No hub is assigned to this hub provider.');
    }

    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      deliveryHubId: hub.id,
      ...(status ? { current_status: status } : {}),
      ...(search ? {
        OR: [
          { receiverName: { contains: search, mode: 'insensitive' } },
          { receiverPhone: { contains: search, mode: 'insensitive' } },
          { receiverAddress: { contains: search, mode: 'insensitive' } },
          { shipment_number: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: { sender: { include: { profile: true } }, originHub: true, deliveryHub: true, branch: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }
}
