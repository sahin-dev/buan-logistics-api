import "dotenv/config";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ApplicationStatus,
  BillingCycle,
  CommissionStatus,
  ContainerStatus,
  ContainerType,
  InvoiceStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  QuoteStatus,
  ReferralStatus,
  RewardSource,
  RewardType,
  ShipmentMode,
  ShipmentStatus,
  ShipmentType,
  Tier,
  Role,
  OperationMode,
  IntakeParcelStatus,
} from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  const now = new Date();
  const hashedPassword = await bcrypt.hash("user1234", 10);
  const adminHashedPassword = await bcrypt.hash("admin1234", 10);
  const hubProviderHashedPassword = await bcrypt.hash("hubprovider1234", 10);
  const branchManagerHashedPassword = await bcrypt.hash("branch1234", 10);
  await prisma.$transaction(async (tx) => {
    await tx.hubCommission.deleteMany();
    await tx.userRewardProgress.deleteMany();
    await tx.rewardRule.deleteMany();
    await tx.reward.deleteMany();
    await tx.payment.deleteMany();
    await tx.invoice.deleteMany();
    await tx.shipmentTimeline.deleteMany();
    await tx.shipment.deleteMany();
    await tx.container.deleteMany();
    await tx.intakeParcel.deleteMany();
    await tx.hub.deleteMany();
    await tx.branch.deleteMany();
    await tx.notification.deleteMany();
    await tx.passwordResetToken.deleteMany();
    await tx.userAddress.deleteMany();
    await tx.referral.deleteMany();
    await tx.upgradeApplication.deleteMany();
    await tx.hubProviderProfile.deleteMany();
    await tx.hubProviderApplication.deleteMany();
    await tx.corporatePartnerApplication.deleteMany();
    await tx.corporatePartnerProfile.deleteMany();
    await tx.businessProfile.deleteMany();
    await tx.userProfile.deleteMany();
    await tx.user.deleteMany();
    await tx.quote.deleteMany();

    const adminUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: "admin@buanenterprise.com",
        password:adminHashedPassword,
        provider: "local",
        role: Role.ADMIN,
        referralCode: "REF100001",
      },
    });
    const customerUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: "customer@buanenterprise.com",
        password: hashedPassword,
        provider: "local",
        tier: Tier.T1,
        role: Role.USER,
        referralCode: "REF100002",
      }
      })

    const businessUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: "business@buanenterprise.com",
        password: hashedPassword,
        provider: "local",
        tier: Tier.T2,
        role: Role.USER,
        referralCode: "REF100003",
      },
    });

    const containerUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: "container@buanenterprise.com",
        password: hashedPassword,
        provider: "local",
        tier: Tier.T3,
        role: Role.USER,
        referralCode: "REF100004",
      },
    });

    const corporateUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: "corporate@buanenterprise.com",
        password: hashedPassword,
        provider: "local",
        role: Role.CORPORATE_PARTNER,
        referralCode: "REF100005",
      },
    });

    const hubProviderUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: "hub@buanenterprise.com",
        password: hubProviderHashedPassword,
        provider: "local",
        tier: Tier.T2,
        role: Role.HUB_PROIVDER,
        referralCode: "REF100006",
      },
    });

    const branchManagerUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: "branch@buanenterprise.com",
        password: branchManagerHashedPassword,
        provider: "local",
        role: Role.BRANCH,
        referralCode: "REF100007",
      },
    });

    await tx.userProfile.create({
      data: {
        userId: customerUser.id,
        firstName: "Ada",
        lastName: "Lovelace",
        location: "Lagos",
        phone: "+2348000000000",
        address: "12 Sample Drive",
      },
    });

    await tx.businessProfile.create({
      data: {
        userId: businessUser.id,
        autorizedPersonFullName: "Ada Lovelace",
        authorizedPersonTitle: "Operations Lead",
        companyName: "Bright Logistics",
        tradingName: "Bright Logistics",
        Reg_no: "REG-1001",
        country: "Nigeria",
        address: "5 Market Street",
        email: "ops@brightlogistics.test",
        phone: "+2348000000001",
        website: "https://brightlogistics.test",
        type: "Logistics",
        status: ApplicationStatus.Pending,
        operation_mode: OperationMode.Both,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.businessProfile.create({
      data: {
        userId: containerUser.id,
        autorizedPersonFullName: "Ada Lovelace",
        authorizedPersonTitle: "Operations Lead",
        companyName: "Bright Logistics",
        tradingName: "Bright Logistics",
        Reg_no: "REG-1001",
        country: "Nigeria",
        address: "5 Market Street",
        email: "abc@brightlogistics.test",
        phone: "+2348000000002",
        website: "https://brightlogistics.test",
        type: "Logistics",
        status: ApplicationStatus.Pending,
        operation_mode: OperationMode.Both,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.corporatePartnerProfile.create({
      data: {
        userId: corporateUser.id,
        companyName: "Blue Ocean Cargo",
        tradingName: "Blue Ocean",
        regNo: "CP-9001",
        country: "Kenya",
        address: "88 Harbor Road",
        yearsInOperation: "6",
        contactName: "Moses Kibet",
        contactPosition: "Supply Chain Director",
        contactPhone: "+254700000000",
        contactEmail: "moses@blueocean.test",
        website: "https://blueocean.test",
        businessNature: ["Freight", "Warehousing"],
        countriesOperateFrom: "Kenya",
        countriesShipTo: "Uganda",
        cargoTypes: ["General Cargo", "Perishables"],
        estimatedMonthlyVolume: "250",
        servicesRequired: "Express Delivery",
        billingCycle: BillingCycle.MONTHLY,
      },
    });

    await tx.corporatePartnerApplication.create({
      data: {
        userId: corporateUser.id,
        companyName: "Blue Ocean Cargo",
        tradingName: "Blue Ocean",
        regNo: "CP-9001",
        country: "Kenya",
        address: "88 Harbor Road",
        yearsInOperation: "6",
        contactName: "Moses Kibet",
        contactPosition: "Supply Chain Director",
        contactPhone: "+254700000000",
        contactEmail: "moses@blueocean.test",
        website: "https://blueocean.test",
        businessNature: ["Freight", "Warehousing"],
        countriesOperateFrom: "Kenya",
        countriesShipTo: "Uganda",
        cargoTypes: ["General Cargo", "Perishables"],
        estimatedMonthlyVolume: "250",
        servicesRequired: "Express Delivery",
        status: ApplicationStatus.Pending,
      },
    });

    await tx.hubProviderProfile.create({
      data: {
        userId: hubProviderUser.id,
      },
    });

    await tx.hubProviderApplication.create({
      data: {
        shopName: "City Hub Station",
        address: "14 Market Avenue",
        landmark: "Near Central Mosque",
        cityOrState: "Lagos",
        contact: "+2348000000011",
        email: "hub@angel1951.test",
        cctvAvailable: true,
        ownerName: "Kelechi Okafor",
        ownerEmail: "kelechi@angel1951.test",
        prefferedContactMethod: "Phone",
        operatingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        email_active_window_from: new Date("2026-01-01T08:00:00.000Z"),
        email_active_window_to: new Date("2026-01-01T18:00:00.000Z"),
        daily_minimum_staff: 3,
        daily_maximum_staff: 8,
        daily_foot_traffic: "High",
        handledDeliveryServiceBefore: true,
        atLeastSixMonthCommitted: true,
        comments: "Ideal for urban pickup operations",
        image_urls: ["https://example.com/hub-1.jpg"],
        status: ApplicationStatus.Pending,
      },
    });

    await tx.upgradeApplication.create({
      data: {
        userId: customerUser.id,
        targetTier: Tier.T3,
        status: ApplicationStatus.Pending,
        notes: "Requested higher tier coverage",
        companyName: "Bright Logistics",
        tradingName: "Bright Logistics",
        Reg_no: "REG-1001",
        country: "Nigeria",
        address: "5 Market Street",
        email: "ops@brightlogistics.test",
        phone: "+2348000000001",
        website: "https://brightlogistics.test",
        type: "Logistics",
        operation_mode: OperationMode.Both,
        yearsInOperation: "5",
        contactName: "Ada Lovelace",
        contactPosition: "Operations Lead",
        contactPhone: "+2348000000000",
        contactEmail: "ada@brightlogistics.test",
        businessNature: ["Freight"],
        countriesOperateFrom: "Nigeria",
        countriesShipTo: "Ghana",
        cargoTypes: ["General Cargo"],
        estimatedMonthlyVolume: "100",
        servicesRequired: "Priority Shipping",
      },
    });

    await tx.referral.create({
      data: {
        id: randomUUID(),
        referrerUserId: adminUser.id,
        referredEmail: "newuser@angel1951.test",
        referralCode: adminUser.referralCode!,
        status: ReferralStatus.PENDING,
        rewardPoints: 25,
      },
    });

    await tx.referral.createMany({
      data: [
        {
          id: randomUUID(),
          referrerUserId: customerUser.id,
          referredEmail: businessUser.email,
          referredUserId: businessUser.id,
          referralCode: customerUser.referralCode!,
          status: ReferralStatus.COMPLETED,
          rewardPoints: 20,
          createdAt: new Date("2026-02-10T09:00:00.000Z"),
          updatedAt: new Date("2026-02-10T09:00:00.000Z"),
        },
        {
          id: randomUUID(),
          referrerUserId: customerUser.id,
          referredEmail: containerUser.email,
          referredUserId: containerUser.id,
          referralCode: customerUser.referralCode!,
          status: ReferralStatus.COMPLETED,
          rewardPoints: 20,
          createdAt: new Date("2026-02-10T10:00:00.000Z"),
          updatedAt: new Date("2026-02-10T10:00:00.000Z"),
        },
        {
          id: randomUUID(),
          referrerUserId: customerUser.id,
          referredEmail: "pending.friend@buanenterprise.com",
          referralCode: customerUser.referralCode!,
          status: ReferralStatus.PENDING,
          rewardPoints: 0,
          createdAt: new Date("2026-02-10T11:00:00.000Z"),
          updatedAt: new Date("2026-02-10T11:00:00.000Z"),
        },
        {
          id: randomUUID(),
          referrerUserId: customerUser.id,
          referredEmail: corporateUser.email,
          referredUserId: corporateUser.id,
          referralCode: customerUser.referralCode!,
          status: ReferralStatus.COMPLETED,
          rewardPoints: 20,
          createdAt: new Date("2026-02-10T12:00:00.000Z"),
          updatedAt: new Date("2026-02-10T12:00:00.000Z"),
        },
      ],
    });

    await tx.passwordResetToken.create({
      data: {
        userId: customerUser.id,
        token: "seed-reset-token-123",
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    await tx.userAddress.create({
      data: {
        userId: customerUser.id,
        title: "Home",
        address: "12 Sample Drive, Lagos",
        isDefault: true,
      },
    });

    const branch = await tx.branch.create({
      data: {
        id: randomUUID(),
        name: "Lagos Main Branch",
        address: "1 Marina Road",
        city: "Lagos",
        latitude: 6.5244,
        longitude: 3.3792,
        new_shipment: true,
        new_shipment_count: 2,
      },
    });

    await tx.user.update({
      where: { id: branchManagerUser.id },
      data: { branchId: branch.id },
    });

    const originHub = await tx.hub.create({
      data: {
        id: randomUUID(),
        name: "Lagos Transit Hub",
        address: "7 Ikorodu Road",
        branchId: branch.id,
        hubProviderId: hubProviderUser.id,
        commissionPerPackage: 5.5,
        new_parcel: true,
        new_parcel_count: 3,
      },
    });

    const deliveryHub = await tx.hub.create({
      data: {
        id: randomUUID(),
        name: "Victoria Island Delivery Hub",
        address: "19 Ahmadu Bello Way",
        branchId: branch.id,
        commissionPerPackage: 4.0,
      },
    });

    const intakeParcel = await tx.intakeParcel.create({
      data: {
        id: randomUUID(),
        intake_number: "TRK0001",
        hubId: originHub.id,
        full_name: "Grace Thompson",
        phone: "+2348000000002",
        address: "21 Harbor Street",
        package_info: "Electronics parcel from intake flow",
        image_urls: ["uploads/seed-intake-electronics.jpg"],
        status: IntakeParcelStatus.ARRIVED_AT_BRANCH,
        handedOverAt: now,
        arrivedAt: now,
      },
    });

    await tx.intakeParcel.create({
      data: {
        id: randomUUID(),
        intake_number: "TRK0002",
        hubId: originHub.id,
        full_name: "Aisha Bello",
        phone: "+2348000000088",
        address: "31 Broad Street",
        package_info: "Clothing parcel handed over to branch",
        image_urls: ["uploads/seed-intake-clothing.jpg"],
        status: IntakeParcelStatus.HANDED_OVER,
        handedOverAt: now,
      },
    });

    await tx.intakeParcel.create({
      data: {
        id: randomUUID(),
        intake_number: "TRK0003",
        hubId: originHub.id,
        full_name: "Samuel Okoro",
        phone: "+2348000000099",
        address: "42 Allen Avenue",
        package_info: "Documents awaiting branch arrival",
        image_urls: ["uploads/seed-intake-documents.jpg"],
        status: IntakeParcelStatus.AWAITING_PICKUP,
      },
    });

    const container = await tx.container.create({
      data: {
        id: randomUUID(),
        containerNumber: "CTR-1001",
        size: "40ft",
        type: ContainerType.FULL,
        branchId: branch.id,
        status: ContainerStatus.LOADING,
      },
    });

    const shipment = await tx.shipment.create({
      data: {
        id: randomUUID(),
        shipment_number: "BN-2026-000001",
        tracking_number: "TRK-2026-000001",
        senderId: customerUser.id,
        receiverName: "Grace Thompson",
        receiverPhone: "+2348000000002",
        receiverAddress: "21 Harbor Street",
        weight: 12.5,
        description: "Electronics parcel",
        packageDetails: { dimensions: "40x30x20", category: "electronics" },
        containerDetails: { containerType: "FULL" },
        hubId: originHub.id,
        originHubId: originHub.id,
        branchId: branch.id,
        deliveryHubId: deliveryHub.id,
        cost: 120.75,
        shipped_at: now,
        delivered_at: now,
        current_status: ShipmentStatus.DELIVERED,
        type: ShipmentType.EXPRESS,
        shipmentType: ShipmentMode.AIR_CARGO,
        pickupContactName: "Ada Lovelace",
        pickupContactPhone: "+2348000000000",
        pickupAddress: "12 Sample Drive",
        scheduledPickupDate: now,
        containerId: container.id,
      },
    });

    const intakeShipment = await tx.shipment.create({
      data: {
        id: randomUUID(),
        shipment_number: "BN-2026-000002",
        tracking_number: "TRK-2026-000002",
        senderId: customerUser.id,
        receiverName: intakeParcel.full_name,
        receiverPhone: intakeParcel.phone,
        receiverAddress: intakeParcel.address,
        weight: 4.2,
        description: intakeParcel.package_info,
        packageDetails: { source: "intake-parcel-seed" },
        hubId: intakeParcel.hubId,
        originHubId: intakeParcel.hubId,
        branchId: branch.id,
        deliveryHubId: deliveryHub.id,
        cost: 45.5,
        current_status: ShipmentStatus.ARRIVED_AT_BRANCH,
        type: ShipmentType.STANDARD,
        shipmentType: ShipmentMode.SEA_CARGO,
      },
    });

    await tx.shipmentTimeline.create({
      data: {
        shipmentId: shipment.id,
        status: ShipmentStatus.PENDING,
        notes: "Shipment created and prepared for pickup",
        photo_urls: ["https://example.com/label-1.jpg"],
      },
    });

    await tx.shipmentTimeline.create({
      data: {
        shipmentId: intakeShipment.id,
        status: ShipmentStatus.ARRIVED_AT_BRANCH,
        notes: "Shipment created from arrived intake parcel at branch",
        photo_urls: intakeParcel.image_urls,
      },
    });

    await tx.shipmentTimeline.create({
      data: {
        shipmentId: shipment.id,
        status: ShipmentStatus.IN_TRANSIT,
        notes: "Parcel is on the way to the destination",
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        id: randomUUID(),
        invoice_number: "INV-1001",
        amount: 120.75,
        remaining_amount: 120.75,
        status: InvoiceStatus.PENDING,
        payment_type: PaymentType.FULL,
        due_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        shipmentId: shipment.id,
        userId: customerUser.id,
        discountAmount: 0,
        rewardNote: null,
      },
    });

    await tx.payment.create({
      data: {
        id: randomUUID(),
        invoiceId: invoice.id,
        amount: 120.75,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.BANK_TRANSFER,
        transactionId: "TXN-SEED-1001",
        installmentNo: 1,
      },
    });

    await tx.rewardRule.createMany({
      data: [
        {
          rewardType: RewardType.AIR_CARGO,
          name: "Air Cargo Reward",
          description: "Unlocks after 2 air cargo deliveries",
          thresholdCount: 2,
          thresholdWeight: 0,
          discountPercent: 10,
          freeShipment: false,
          freeKgLimit: 0,
          isActive: true,
        },
        {
          rewardType: RewardType.SEA_CARGO,
          name: "Sea Cargo Reward",
          description: "Unlocks after 3 sea cargo deliveries",
          thresholdCount: 3,
          thresholdWeight: 0,
          discountPercent: 8,
          freeShipment: false,
          freeKgLimit: 0,
          isActive: true,
        },
        {
          rewardType: RewardType.KG_SHIPMENT,
          name: "Kg Shipment Reward",
          description: "Unlocks after 100kg shipped",
          thresholdCount: 0,
          thresholdWeight: 100,
          discountPercent: 5,
          freeShipment: false,
          freeKgLimit: 0,
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });

    await tx.userRewardProgress.create({
      data: {
        userId: customerUser.id,
        rewardType: RewardType.AIR_CARGO,
        completedCount: 2,
        completedWeight: 0,
        available: true,
        lastCompletedAt: now,
      },
    });

    await tx.userRewardProgress.create({
      data: {
        userId: customerUser.id,
        rewardType: RewardType.SEA_CARGO,
        completedCount: 1,
        completedWeight: 0,
        available: false,
        lastCompletedAt: now,
      },
    });

    await tx.reward.create({
      data: {
        id: randomUUID(),
        userId: customerUser.id,
        shipmentId: shipment.id,
        invoiceId: invoice.id,
        source: RewardSource.SHIPMENT,
        rewardType: RewardType.AIR_CARGO,
        description: "Welcome shipment reward",
        points: 10,
        claimed: true,
        claimedAt: now,
      },
    });

    await tx.reward.createMany({
      data: [
        {
          id: randomUUID(),
          userId: customerUser.id,
          source: RewardSource.REFERRAL,
          description: "Air Cargo Shipment +1",
          points: 20,
          claimed: false,
          createdAt: new Date("2026-02-10T09:05:00.000Z"),
        },
        {
          id: randomUUID(),
          userId: customerUser.id,
          source: RewardSource.REFERRAL,
          description: "Air Cargo Shipment +1",
          points: 20,
          claimed: true,
          claimedAt: new Date("2026-02-12T09:05:00.000Z"),
          createdAt: new Date("2026-02-10T10:05:00.000Z"),
        },
        {
          id: randomUUID(),
          userId: customerUser.id,
          source: RewardSource.REFERRAL,
          description: "Air Cargo Shipment +1",
          points: 20,
          claimed: false,
          createdAt: new Date("2026-02-10T12:05:00.000Z"),
        },
        {
          id: randomUUID(),
          userId: adminUser.id,
          source: RewardSource.REFERRAL,
          description: "Referral invitation pending bonus",
          points: 0,
          claimed: false,
          createdAt: new Date("2026-02-10T13:05:00.000Z"),
        },
      ],
    });

    await tx.notification.create({
      data: {
        id: randomUUID(),
        userId: customerUser.id,
        title: "Shipment created",
        message: "Your shipment has been registered successfully",
        type: NotificationType.SHIPMENT,
        metadata: { shipmentId: shipment.id },
      },
    });

    await tx.quote.create({
      data: {
        id: randomUUID(),
        shipmentType: "Air Cargo",
        country: "Nigeria",
        pickupServices: "Doorstep",
        fullName: "Ada Lovelace",
        phone: "+2348000000000",
        address: "12 Sample Drive",
        whatWeArePickingUp: "Laptop",
        email: "ada@brightlogistics.test",
        shippingType: "Express",
        weightOrVolume: "5kg",
        receiverCountry: "Ghana",
        receiverFullName: "Grace Thompson",
        receiverPhone: "+233500000000",
        receiverEmail: "grace@example.com",
        receiverAddress: "21 Harbor Street",
        status: QuoteStatus.PENDING,
      },
    });

    await tx.hubCommission.create({
      data: {
        id: randomUUID(),
        hubId: originHub.id,
        shipmentId: shipment.id,
        amount: 5.5,
        status: CommissionStatus.PENDING,
      },
    });
  });

  console.log("Seed data created successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
