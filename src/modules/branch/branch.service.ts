import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dtos/create-branch.dto';
import { CreateHubDto } from './dtos/create-hub.dto';
import { CommissionStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dtos/paginated-response.dto';

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) { }

  async createBranch(dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: dto,
    });
  }

  async getAllBranches(query: PaginationQueryDto) {
    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(status ? { status } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        include: { hubs: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getBranchById(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { hubs: true, users: { include: { profile: true }, omit: { password: true } } },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  async createHub(dto: CreateHubDto) {
    // Check if branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
    }

    // If hubProviderId is provided, check user exists and update role
    if (dto.hubProviderId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.hubProviderId },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${dto.hubProviderId} not found`);
      }
      await this.prisma.user.update({
        where: { id: dto.hubProviderId },
        data: { role: 'HUB_PROIVDER' },
      });
    }

    return this.prisma.hub.create({
      data: {
        name: dto.name,
        address: dto.address,
        branchId: dto.branchId,
        hubProviderId: dto.hubProviderId,
        commissionPerPackage: dto.commissionPerPackage ?? 0.0,
      },
      include: { branch: true },
    });
  }

  async getAllHubs(query: PaginationQueryDto) {
    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(status ? { status } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.hub.findMany({
        where,
        skip,
        take: limit,
        include: { branch: true, hubProvider: { include: { profile: true }, omit: { password: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hub.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getHubsByBranchId(branchId: string, query: PaginationQueryDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      branchId,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(status ? { status } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.hub.findMany({
        where,
        skip,
        take: limit,
        include: { branch: true, hubProvider: { include: { profile: true }, omit: { password: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hub.count({ where }),
    ]);

    await this.prisma.hub.updateMany({
      where: { branchId },
      data: {
        new_parcel: false,
        new_parcel_count: 0,
      },
    });

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async getHubById(id: string) {
    const hub = await this.prisma.hub.findUnique({
      where: { id },
      include: { branch: true, hubProvider: { include: { profile: true }, omit: { password: true } } },
    });
    if (!hub) {
      throw new NotFoundException(`Hub with ID ${id} not found`);
    }
    return hub;
  }

  async assignHubProvider(hubId: string, hubProviderId: string) {
    const hub = await this.prisma.hub.findUnique({
      where: { id: hubId },
    });
    if (!hub) {
      throw new NotFoundException(`Hub with ID ${hubId} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: hubProviderId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${hubProviderId} not found`);
    }

    // Update user's role to HUB_PROIVDER
    await this.prisma.user.update({
      where: { id: hubProviderId },
      data: { role: 'HUB_PROIVDER' },
    });

    return this.prisma.hub.update({
      where: { id: hubId },
      data: { hubProviderId },
      include: { hubProvider: { include: { profile: true } } },
    });
  }

  async assignBranchUser(branchId: string, userId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        branchId,
        role: 'BRANCH',
      },
      include: {
        profile: true,
        branch: true,
      },
      omit: { password: true },
    });
  }

  // ─── Hub Commission Methods ──────────────────────────────────────────────────

  async getHubCommissions(hubId: string, query: PaginationQueryDto) {
    const hub = await this.prisma.hub.findUnique({ where: { id: hubId } });
    if (!hub) {
      throw new NotFoundException(`Hub with ID ${hubId} not found`);
    }

    const { page, limit, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      hubId,
      ...(status ? { status } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.hubCommission.findMany({
        where,
        skip,
        take: limit,
        include: {
          shipment: {
            select: { id: true, tracking_number: true, createdAt: true, weight: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hubCommission.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async payHubCommission(commissionId: string) {
    const commission = await this.prisma.hubCommission.findUnique({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new NotFoundException(`Commission with ID ${commissionId} not found`);
    }

    if (commission.status === CommissionStatus.PAID) {
      throw new BadRequestException('Commission has already been paid.');
    }

    return this.prisma.hubCommission.update({
      where: { id: commissionId },
      data: {
        status: CommissionStatus.PAID,
        paidAt: new Date(),
      },
      include: { hub: true, shipment: true },
    });
  }
}
