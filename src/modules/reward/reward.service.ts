import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardSource } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dtos/paginated-response.dto';

@Injectable()
export class RewardService {
  constructor(private readonly prisma: PrismaService) {}

  async awardReward(shipmentId: string, userId: string, points = 10) {
    // Check if reward already exists for this shipment
    const existing = await this.prisma.reward.findUnique({
      where: { shipmentId },
    });
    if (existing) {
      return existing;
    }

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

  async redeemPoints(userId: string, pointsToRedeem: number) {
    if (pointsToRedeem <= 0) {
      throw new BadRequestException('Points to redeem must be greater than zero.');
    }

    const { totalPoints } = await this.getRewardSummary(userId);
    if (totalPoints < pointsToRedeem) {
      throw new BadRequestException(`Insufficient points. You only have ${totalPoints} points available.`);
    }

    // 1 point = $0.10 discount
    const discountAmount = pointsToRedeem * 0.10;

    const reward = await this.prisma.reward.create({
      data: {
        userId,
        points: -pointsToRedeem,
        source: RewardSource.REDEEMED,
        description: `Redeemed ${pointsToRedeem} points for a $${discountAmount.toFixed(2)} discount.`,
      },
    });

    return {
      success: true,
      reward,
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
    const { page, limit } = query;
    const skip = query.getSkip();

    const where = { userId };
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
}
