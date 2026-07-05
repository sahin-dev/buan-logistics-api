import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntakeParcelDto } from './dtos/create-intake-parcel.dto';
import { IntakeParcelStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dtos/paginated-response.dto';

@Injectable()
export class IntakeParcelService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateUniqueIntakeNumber(): Promise<string> {
    while (true) {
      const suffix = Math.floor(1000 + Math.random() * 9000).toString();
      const intakeNumber = `TRK${suffix}`;
      const existing = await this.prisma.intakeParcel.findUnique({
        where: { intake_number: intakeNumber },
      });

      if (!existing) {
        return intakeNumber;
      }
    }
  }

  private async getHubIdForProvider(userId: string) {
    const hub = await this.prisma.hub.findFirst({
      where: { hubProviderId: userId },
    });

    if (!hub) {
      throw new NotFoundException('No hub is assigned to this hub provider.');
    }

    return hub.id;
  }

  private async getBranchIdForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { branchId: true },
    });

    if (!user?.branchId) {
      throw new NotFoundException('No branch is assigned to this branch user.');
    }

    return user.branchId;
  }

  async create(dto: CreateIntakeParcelDto, imageUrls: string[], userId: string) {
    const hubId = await this.getHubIdForProvider(userId);
    const intakeNumber = await this.generateUniqueIntakeNumber();

    return this.prisma.intakeParcel.create({
      data: {
        intake_number: intakeNumber,
        hubId,
        full_name: dto.full_name,
        phone: dto.phone,
        address: dto.address,
        package_info: dto.package_info,
        image_urls: imageUrls,
        status: IntakeParcelStatus.AWAITING_PICKUP,
      },
      include: {
        hub: {
          include: {
            hubProvider: { include: { profile: true }, omit: { password: true } },
          },
        },
      },
    });
  }

  async markHandedOver(id: string, userId: string) {
    const hubId = await this.getHubIdForProvider(userId);
    const intakeParcel = await this.prisma.intakeParcel.findUnique({ where: { id } });

    if (!intakeParcel) {
      throw new NotFoundException(`Intake parcel with ID ${id} not found`);
    }

    if (intakeParcel.hubId !== hubId) {
      throw new BadRequestException('This intake parcel does not belong to your hub.');
    }

    if (intakeParcel.status !== IntakeParcelStatus.AWAITING_PICKUP) {
      throw new BadRequestException('Only awaiting pickup parcels can be handed over.');
    }

    return this.prisma.intakeParcel.update({
      where: { id },
      data: {
        status: IntakeParcelStatus.HANDED_OVER,
        handedOverAt: new Date(),
      },
      include: {
        hub: {
          include: {
            hubProvider: { include: { profile: true }, omit: { password: true } },
          },
        },
      },
    });
  }

  async markArrivedAtBranch(id: string) {
    const intakeParcel = await this.prisma.intakeParcel.findUnique({ where: { id } });

    if (!intakeParcel) {
      throw new NotFoundException(`Intake parcel with ID ${id} not found`);
    }

    if (intakeParcel.status !== IntakeParcelStatus.HANDED_OVER) {
      throw new BadRequestException('Only handed over parcels can be marked as arrived at branch.');
    }

    return this.prisma.intakeParcel.update({
      where: { id },
      data: {
        status: IntakeParcelStatus.ARRIVED_AT_BRANCH,
        arrivedAt: new Date(),
      },
      include: {
        hub: {
          include: {
            hubProvider: { include: { profile: true }, omit: { password: true } },
          },
        },
      },
    });
  }

  async getAll(query: PaginationQueryDto) {
    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      ...(search
        ? {
            OR: [
              { full_name: { contains: search, mode: 'insensitive' } },
              { intake_number: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { package_info: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.intakeParcel.findMany({
        where,
        skip,
        take: limit,
        include: {
          hub: {
            include: {
              hubProvider: { include: { profile: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.intakeParcel.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getMine(userId: string, query: PaginationQueryDto) {
    const hub = await this.prisma.hub.findFirst({ where: { hubProviderId: userId } });
    if (!hub) {
      throw new NotFoundException('No hub is assigned to this hub provider.');
    }

    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      hubId: hub.id,
      ...(search
        ? {
            OR: [
              { intake_number: { contains: search, mode: 'insensitive' } },
              { full_name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { package_info: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.intakeParcel.findMany({
        where,
        skip,
        take: limit,
        include: { hub: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.intakeParcel.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getMineAnalytics(userId: string) {
    const hub = await this.prisma.hub.findFirst({ where: { hubProviderId: userId } });
    if (!hub) {
      throw new NotFoundException('No hub is assigned to this hub provider.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, awaitingPickup, handedOver, arrivedAtBranch, createdToday, createdThisMonth] = await Promise.all([
      this.prisma.intakeParcel.count({ where: { hubId: hub.id } }),
      this.prisma.intakeParcel.count({ where: { hubId: hub.id, status: IntakeParcelStatus.AWAITING_PICKUP } }),
      this.prisma.intakeParcel.count({ where: { hubId: hub.id, status: IntakeParcelStatus.HANDED_OVER } }),
      this.prisma.intakeParcel.count({ where: { hubId: hub.id, status: IntakeParcelStatus.ARRIVED_AT_BRANCH } }),
      this.prisma.intakeParcel.count({ where: { hubId: hub.id, createdAt: { gte: today } } }),
      this.prisma.intakeParcel.count({ where: { hubId: hub.id, createdAt: { gte: monthStart } } }),
    ]);

    return {
      hubId: hub.id,
      hubName: hub.name,
      total,
      byStatus: {
        awaitingPickup,
        handedOver,
        arrivedAtBranch,
      },
      createdToday,
      createdThisMonth,
    };
  }

  async getAnalytics() {
    const [total, awaitingPickup, handedOver, arrivedAtBranch] = await Promise.all([
      this.prisma.intakeParcel.count(),
      this.prisma.intakeParcel.count({ where: { status: IntakeParcelStatus.AWAITING_PICKUP } }),
      this.prisma.intakeParcel.count({ where: { status: IntakeParcelStatus.HANDED_OVER } }),
      this.prisma.intakeParcel.count({ where: { status: IntakeParcelStatus.ARRIVED_AT_BRANCH } }),
    ]);

    return {
      total,
      byStatus: {
        awaitingPickup,
        handedOver,
        arrivedAtBranch,
      },
    };
  }

  async getHubProviderSummary() {
    const hubs = await this.prisma.hub.findMany({
      include: {
        hubProvider: { include: { profile: true } },
        _count: { select: { intakeParcels: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return hubs.map((hub) => {
      return {
        hubId: hub.id,
        hubName: hub.name,
        hubProviderId: hub.hubProviderId,
        hubProvider: hub.hubProvider,
        parcelCount: hub._count.intakeParcels,
      };
    });
  }

  private async getBranchParcelsByStatus(
    userId: string,
    query: PaginationQueryDto,
    statusOverride: IntakeParcelStatus,
  ) {
    const branchId = await this.getBranchIdForUser(userId);
    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      hub: { branchId },
      status: status ?? statusOverride,
      ...(search
        ? {
            OR: [
              { full_name: { contains: search, mode: 'insensitive' } },
              { intake_number: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { package_info: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.intakeParcel.findMany({
        where,
        skip,
        take: limit,
        include: {
          hub: {
            include: {
              hubProvider: { include: { profile: true }, omit: { password: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.intakeParcel.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getBranchIncomingParcels(userId: string, query: PaginationQueryDto) {
    return this.getBranchParcelsByStatus(userId, query, IntakeParcelStatus.HANDED_OVER);
  }

  async getBranchArrivedParcels(userId: string, query: PaginationQueryDto) {
    return this.getBranchParcelsByStatus(userId, query, IntakeParcelStatus.ARRIVED_AT_BRANCH);
  }
}
