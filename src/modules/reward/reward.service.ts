import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, RewardSource, RewardType, ShipmentStatus, ShipmentType } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dtos/paginated-response.dto';

@Injectable()
export class RewardService {
  constructor(private readonly prisma: PrismaService) {}

  async awardReward(shipmentId: string, userId: string, points = 10) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { invoices: true },
    });

    if (!shipment) {
      throw new BadRequestException('Shipment not found');
    }

    const existing = await this.prisma.reward.findUnique({
      where: { shipmentId },
    });
    if (existing) {
      return existing;
    }

    const rewardType = this.resolveRewardType(shipment.shipmentType, shipment.weight);
    const rewardRule = await this.getRewardRule(rewardType);

    if (!rewardRule || !rewardRule.isActive) {
      return this.prisma.reward.create({
        data: {
          userId,
          shipmentId,
          points,
          source: RewardSource.SHIPMENT,
          description: 'Points awarded for completed shipment delivery.',
        },
      });
    }

    await this.updateRewardProgress(userId, rewardType, shipment);
    const progress = await this.prisma.userRewardProgress.findUnique({
      where: { userId_rewardType: { userId, rewardType } },
    });

    let rewardAmount = 0;
    let description = 'No reward triggered.';
    let rewardStatus = false;

    if (rewardType === RewardType.AIR_CARGO) {
      rewardAmount = progress?.available ? 1 : 0;
      description = progress?.available ? 'Air cargo reward unlocked for delivery.' : 'Air cargo reward progress updated.';
      rewardStatus = Boolean(progress?.available);
    } else if (rewardType === RewardType.SEA_CARGO) {
      rewardAmount = progress?.available ? 1 : 0;
      description = progress?.available ? 'Sea cargo reward unlocked for delivery.' : 'Sea cargo reward progress updated.';
      rewardStatus = Boolean(progress?.available);
    } else if (rewardType === RewardType.KG_SHIPMENT) {
      rewardAmount = progress?.available ? 1 : 0;
      description = progress?.available ? 'KG shipment reward unlocked for delivery.' : 'KG shipment reward progress updated.';
      rewardStatus = Boolean(progress?.available);
    }

    const invoice = shipment.invoices?.[0];
    const reward = await this.prisma.reward.create({
      data: {
        userId,
        shipmentId,
        invoiceId: invoice?.id,
        points: rewardAmount,
        source: RewardSource.SHIPMENT,
        rewardType,
        description,
        claimed: false,
        claimedAt: null,
      },
    });

    if (rewardStatus) {
      await this.prisma.userRewardProgress.update({
        where: { userId_rewardType: { userId, rewardType } },
        data: { available: true },
      });
    }

    return reward;
  }

  async awardPoints(userId: string, points: number, source: RewardSource, description: string) {
    return this.prisma.reward.create({
      data: {
        userId,
        points,
        source,
        description,
      },
    });
  }

  async redeemReward(userId: string, rewardId: string, invoiceId?: string) {
    const reward = await this.prisma.reward.findUnique({
      where: { id: rewardId },
      include: { shipment: { include: { invoices: true } } },
    });

    if (!reward) {
      throw new BadRequestException('Reward not found.');
    }

    if (reward.userId !== userId) {
      throw new BadRequestException('This reward does not belong to the authenticated user.');
    }

    if (reward.claimed) {
      throw new BadRequestException('This reward has already been redeemed.');
    }

    const targetInvoiceId = invoiceId || reward.invoiceId || reward.shipment?.invoices?.[0]?.id;

    if (!targetInvoiceId) {
      throw new BadRequestException('No invoice is attached to this reward.');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: targetInvoiceId, userId },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found for this user.');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('This invoice has already been paid.');
    }

    if (!reward.rewardType) {
      throw new BadRequestException('This reward does not have a reward type configured.');
    }

    const rewardRule = await this.getRewardRule(reward.rewardType);
    if (!rewardRule || !rewardRule.isActive) {
      throw new BadRequestException('This reward cannot be redeemed at the moment.');
    }

    const currentRemaining = Number(Math.max(0, invoice.remaining_amount ?? invoice.amount ?? 0).toFixed(2));
    const discountAmount = rewardRule.freeShipment
      ? currentRemaining
      : Number((currentRemaining * (rewardRule.discountPercent / 100)).toFixed(2));

    const nextDiscount = Number((Number(invoice.discountAmount ?? 0) + discountAmount).toFixed(2));
    const nextRemaining = Number(Math.max(0, currentRemaining - discountAmount).toFixed(2));

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: targetInvoiceId },
      data: {
        discountAmount: nextDiscount,
        remaining_amount: nextRemaining,
        rewardNote: reward.description || `${reward.rewardType} reward redeemed`,
      },
    });

    const updatedReward = await this.prisma.reward.update({
      where: { id: rewardId },
      data: {
        claimed: true,
        claimedAt: new Date(),
        invoiceId: targetInvoiceId,
      },
    });

    if (reward.rewardType) {
      await this.prisma.userRewardProgress.updateMany({
        where: { userId, rewardType: reward.rewardType },
        data: {
          available: false,
          completedCount: 0,
          completedWeight: 0.0,
        },
      });
    }

    return {
      success: true,
      reward: updatedReward,
      invoice: updatedInvoice,
      discountAmount,
    };
  }

  /** Internal helper — fetches total points without pagination (used for redemption checks) */
  private async getRewardSummary(userId: string) {
    const rewards = await this.prisma.reward.findMany({ where: { userId } });
    const totalPoints = rewards.reduce((acc, curr) => acc + curr.points, 0);
    return { totalPoints };
  }

  /** Paginated list of reward entries for a user */
  async getRewardsByUserId(userId: string, query: PaginationQueryDto) {
    const { page, limit, search, rewardType, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      userId,
      ...(search ? { description: { contains: search, mode: 'insensitive' } } : {}),
      ...(rewardType ? { rewardType } : {}),
      ...(status ? { claimed: status === 'claimed' } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };
    const [rewards, totalItems] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        skip,
        take: limit,
        include: { shipment: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reward.count({ where }),
    ]);

    const allRewards = await this.prisma.reward.findMany({ where: { userId }, select: { points: true } });
    const totalPoints = allRewards.reduce((acc, curr) => acc + curr.points, 0);

    return {
      totalPoints,
      ...PaginatedResponseDto.create(rewards, totalItems, page, limit),
    };
  }

  async getLoyaltyTier(userId: string) {
    const { totalPoints } = await this.getRewardSummary(userId);
    // Loyalty tiers: Bronze (0-100), Silver (101-500), Gold (501+)
    let tier = 'Bronze';
    if (totalPoints > 500) {
      tier = 'Gold';
    } else if (totalPoints > 100) {
      tier = 'Silver';
    }

    return {
      totalPoints,
      tier,
    };
  }

  async getUserRewardProgress(userId: string) {
    const [progressRows, rewardRules] = await Promise.all([
      this.prisma.userRewardProgress.findMany({
        where: { userId },
        orderBy: { rewardType: 'asc' },
      }),
      this.prisma.rewardRule.findMany({
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const progressMap = new Map(progressRows.map((item) => [item.rewardType, item]));

    const progressEntries = await Promise.all(
      rewardRules.map(async (rule) => {
        if (!progressMap.has(rule.rewardType)) {
          const createdProgress = await this.prisma.userRewardProgress.upsert({
            where: { userId_rewardType: { userId, rewardType: rule.rewardType } },
            update: {},
            create: { userId, rewardType: rule.rewardType },
          });
          progressMap.set(rule.rewardType, createdProgress);
        }

        return progressMap.get(rule.rewardType);
      }),
    );

    return rewardRules.map((rule, index) => {
      const progress = progressEntries[index];
      const currentProgress = rule.rewardType === RewardType.KG_SHIPMENT
        ? progress?.completedWeight ?? 0
        : progress?.completedCount ?? 0;
      const threshold = rule.rewardType === RewardType.KG_SHIPMENT
        ? rule.thresholdWeight
        : rule.thresholdCount;
      const progressPercent = threshold > 0 ? Math.min(100, (currentProgress / threshold) * 100) : 0;

      return {
        rewardType: rule.rewardType,
        rewardName: rule.name,
        description: rule.description,
        thresholdCount: rule.thresholdCount,
        thresholdWeight: rule.thresholdWeight,
        discountPercent: rule.discountPercent,
        freeShipment: rule.freeShipment,
        freeKgLimit: rule.freeKgLimit,
        isActive: rule.isActive,
        userProgress: {
          id: progress?.id ?? null,
          completedCount: progress?.completedCount ?? 0,
          completedWeight: progress?.completedWeight ?? 0,
          currentProgress,
          threshold,
          available: progress?.available ?? false,
          progressPercent: Number(progressPercent.toFixed(2)),
          remainingToUnlock: Math.max(0, threshold - currentProgress),
          lastCompletedAt: progress?.lastCompletedAt ?? null,
        },
      };
    });
  }

  async createOrUpdateRewardRule(data: {
    rewardType: RewardType;
    name: string;
    description?: string;
    thresholdCount?: number;
    thresholdWeight?: number;
    discountPercent?: number;
    freeShipment?: boolean;
    freeKgLimit?: number;
    isActive?: boolean;
  }) {
    return this.prisma.rewardRule.upsert({
      where: { rewardType: data.rewardType },
      update: {
        name: data.name,
        description: data.description,
        thresholdCount: data.thresholdCount ?? 0,
        thresholdWeight: data.thresholdWeight ?? 0,
        discountPercent: data.discountPercent ?? 0,
        freeShipment: data.freeShipment ?? false,
        freeKgLimit: data.freeKgLimit ?? 0,
        isActive: data.isActive ?? true,
      },
      create: {
        rewardType: data.rewardType,
        name: data.name,
        description: data.description,
        thresholdCount: data.thresholdCount ?? 0,
        thresholdWeight: data.thresholdWeight ?? 0,
        discountPercent: data.discountPercent ?? 0,
        freeShipment: data.freeShipment ?? false,
        freeKgLimit: data.freeKgLimit ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async getRewardRules() {
    return this.prisma.rewardRule.findMany({ orderBy: { createdAt: 'asc' } });
  }

  private resolveRewardType(shipmentType?: ShipmentType | null, weight?: number | null): RewardType {
    if (shipmentType === ShipmentType.AIR_CARGO) {
      return RewardType.AIR_CARGO;
    }
    if (shipmentType === ShipmentType.SEA_CARGO) {
      return weight && weight >= 100 ? RewardType.KG_SHIPMENT : RewardType.SEA_CARGO;
    }
    return RewardType.KG_SHIPMENT;
  }

  private async getRewardRule(rewardType: RewardType) {
    return this.prisma.rewardRule.findUnique({ where: { rewardType } });
  }

  private async updateRewardProgress(userId: string, rewardType: RewardType, shipment: { weight: number; current_status: ShipmentStatus; shipmentType?: ShipmentType | null }) {
    const rule = await this.getRewardRule(rewardType);
    if (!rule || !rule.isActive) {
      return;
    }

    const progress = await this.prisma.userRewardProgress.upsert({
      where: { userId_rewardType: { userId, rewardType } },
      update: {},
      create: { userId, rewardType },
    });

    let completedCount = progress.completedCount;
    let completedWeight = progress.completedWeight;

    if (shipment.current_status === ShipmentStatus.DELIVERED) {
      if (rewardType === RewardType.AIR_CARGO || rewardType === RewardType.SEA_CARGO) {
        completedCount += 1;
      }
      if (rewardType === RewardType.KG_SHIPMENT) {
        completedWeight += shipment.weight;
      }
      const available =
        (rewardType === RewardType.AIR_CARGO || rewardType === RewardType.SEA_CARGO)
          ? completedCount >= rule.thresholdCount
          : completedWeight >= rule.thresholdWeight;

      await this.prisma.userRewardProgress.update({
        where: { userId_rewardType: { userId, rewardType } },
        data: {
          completedCount,
          completedWeight,
          available,
          lastCompletedAt: new Date(),
        },
      });
    }
  }

  private calculateDiscountAmount(rule: { discountPercent: number; freeShipment: boolean; freeKgLimit: number }, invoiceAmount: number) {
    if (rule.freeShipment) {
      return invoiceAmount;
    }
    return Number((invoiceAmount * (rule.discountPercent / 100)).toFixed(2));
  }
}
