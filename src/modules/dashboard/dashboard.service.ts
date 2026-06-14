import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShipmentStatus, ApplicationStatus } from 'generated/prisma/enums';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboardStats(year: number) {
    // 1. Shipment Metrics
    const totalCreated = await this.prisma.shipment.count();
    const totalPicked = await this.prisma.shipment.count({
      where: { current_status: ShipmentStatus.PICKED },
    });
    const atHub = await this.prisma.shipment.count({
      where: { current_status: ShipmentStatus.AT_HUB },
    });
    const inTransit = await this.prisma.shipment.count({
      where: { current_status: ShipmentStatus.IN_TRANSIT },
    });
    const outDelivery = await this.prisma.shipment.count({
      where: { current_status: ShipmentStatus.OUT_OF_DELIVERY },
    });
    const delivered = await this.prisma.shipment.count({
      where: { current_status: ShipmentStatus.DELIVERED },
    });

    // 2. User Growth (monthly for the specified year)
    const userGrowth = Array(12).fill(0);
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
      select: { createdAt: true },
    });

    users.forEach((user) => {
      const month = user.createdAt.getUTCMonth(); // 0 to 11
      userGrowth[month]++;
    });

    // 3. Earning Growth (monthly for the specified year, based on completed payments)
    const earningGrowth = Array(12).fill(0);
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        paymentDate: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
      select: { amount: true, paymentDate: true },
    });

    payments.forEach((payment) => {
      const month = payment.paymentDate.getUTCMonth();
      earningGrowth[month] += payment.amount;
    });

    // 4. Pending Hub Provider Applications
    const pendingHubRequests = await this.prisma.hubProviderApplication.findMany({
      where: { status: ApplicationStatus.Pending },
    });

    // 5. Pending Business Partner Requests (BusinessProfile pending status)
    const pendingBusinessRequests = await this.prisma.businessProfile.findMany({
      where: { status: ApplicationStatus.Pending },
    });

    return {
      metrics: {
        totalCreated,
        totalPicked,
        atHub,
        inTransit,
        outDelivery,
        delivered,
      },
      userGrowth,
      earningGrowth,
      pendingHubRequests,
      pendingBusinessRequests,
    };
  }
}
