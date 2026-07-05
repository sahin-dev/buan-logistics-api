import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../reward/reward.service';
import { ReferralStatus, RewardSource } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dtos/paginated-response.dto';

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
  ) {}

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

  async ensureUserReferralCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.referralCode) {
      return user.referralCode;
    }

    const referralCode = await this.generateUniqueReferralCode();
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode },
    });

    return referralCode;
  }

  async createReferralInvite(referrerUserId: string, referredEmail: string) {
    const trimmedEmail = referredEmail.trim().toLowerCase();

    // Check if referred email is already a registered user
    const existingUser = await this.prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (existingUser) {
      throw new BadRequestException('This email is already registered on Buan Logistics.');
    }

    // Check if there is already a pending invite for this email
    const existingInvite = await this.prisma.referral.findFirst({
      where: {
        referredEmail: trimmedEmail,
        status: 'PENDING',
      },
    });
    if (existingInvite) {
      throw new BadRequestException('A referral invitation has already been sent to this email.');
    }

    const referralCode = await this.ensureUserReferralCode(referrerUserId);

    return this.prisma.referral.create({
      data: {
        referrerUserId,
        referredEmail: trimmedEmail,
        referralCode,
        status: ReferralStatus.PENDING,
      },
    });
  }

  async getMyReferrals(userId: string, query: PaginationQueryDto) {
    const { page, limit, search, status, startDate, endDate } = query;
    const skip = query.getSkip();

    const where: any = {
      referrerUserId: userId,
      ...(search ? { referredEmail: { contains: search, mode: 'insensitive' } } : {}),
      ...(status ? { status } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      } : {}),
    };
    const [data, totalItems] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip,
        take: limit,
        include: {
          referredUser: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return PaginatedResponseDto.create(data, totalItems, page, limit);
  }

  async applyReferralCode(referredUserId: string, userEmail: string, referralCode: string) {
    if (!referralCode || !referralCode.trim()) {
      return { success: false, message: 'Referral code is required.' };
    }

    const normalizedCode = referralCode.trim().toUpperCase();

    const referredUser = await this.prisma.user.findUnique({
      where: { id: referredUserId },
    });

    if (!referredUser) {
      return { success: false, message: 'User not found.' };
    }

    const trimmedEmail = referredUser.email.trim().toLowerCase();

    const existingReferral = await this.prisma.referral.findUnique({
      where: { referredUserId },
    });

    if (existingReferral) {
      return { success: false, message: 'A referral code has already been applied for this user.' };
    }

    const codeOwner = await this.prisma.user.findUnique({
      where: { referralCode: normalizedCode },
    });

    if (!codeOwner) {
      return { success: false, message: 'Invalid referral code.' };
    }

    if (codeOwner.id === referredUserId) {
      return { success: false, message: 'You cannot use your own referral code.' };
    }

    const pendingInvite = await this.prisma.referral.findFirst({
      where: {
        referralCode: normalizedCode,
        referredEmail: trimmedEmail,
        status: ReferralStatus.PENDING,
      },
    });

    if (pendingInvite) {
      await this.prisma.referral.update({
        where: { id: pendingInvite.id },
        data: {
          referredUserId,
          status: ReferralStatus.COMPLETED,
          rewardPoints: 20.0,
        },
      });
    } else {
      await this.prisma.referral.create({
        data: {
          referrerUserId: codeOwner.id,
          referredEmail: trimmedEmail,
          referredUserId,
          referralCode: normalizedCode,
          status: ReferralStatus.COMPLETED,
          rewardPoints: 20.0,
        },
      });
    }

    await this.rewardService.awardPoints(
      codeOwner.id,
      20.0,
      RewardSource.REFERRAL,
      `Referral bonus for inviting ${trimmedEmail}`,
    );

    // Award points to referred user (10 points)
    await this.rewardService.awardPoints(
      referredUserId,
      10.0,
      RewardSource.REFERRAL,
      'Welcome bonus for registering via referral.',
    );

    return { success: true, message: 'Referral code applied successfully.' };
  }

  async getMyReferralCode(userId: string) {
    const referralCode = await this.ensureUserReferralCode(userId);
    return { referralCode };
  }

  async getDashboard(userId: string) {
    const referralCode = await this.ensureUserReferralCode(userId);

    const [totalReferrals, successfulReferrals, pendingReferrals, referralRewards] = await Promise.all([
      this.prisma.referral.count({ where: { referrerUserId: userId } }),
      this.prisma.referral.count({ where: { referrerUserId: userId, status: ReferralStatus.COMPLETED } }),
      this.prisma.referral.count({ where: { referrerUserId: userId, status: ReferralStatus.PENDING } }),
      this.prisma.reward.findMany({
        where: { userId, source: RewardSource.REFERRAL },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalEarned = referralRewards.reduce((sum, reward) => sum + reward.points, 0);
    const availableBonus = referralRewards
      .filter((reward) => !reward.claimed)
      .reduce((sum, reward) => sum + reward.points, 0);
    const usedBonus = referralRewards
      .filter((reward) => reward.claimed)
      .reduce((sum, reward) => sum + reward.points, 0);

    return {
      referralCode,
      availableBonus,
      pendingBonus: pendingReferrals,
      totalEarned,
      stats: {
        totalReferrals,
        successfulReferrals,
        rewardsEarned: referralRewards.length,
        usedBonus,
      },
      rewardHistory: referralRewards.map((reward) => ({
        id: reward.id,
        title: reward.description || 'Referral Bonus +1',
        points: reward.points,
        status: reward.claimed ? 'USED' : 'ACTIVE',
        createdAt: reward.createdAt,
        claimedAt: reward.claimedAt,
      })),
      rules: [
        'Points reset after reward is used',
        'Loyalty rewards auto applied at checkout',
        '10% discount applies to one air cargo shipment',
        'Free shipment applies to one sea cargo shipment',
        'Extra rewards for every 10kg shipment',
      ],
    };
  }

  async getReferralHistory(userId: string, query: PaginationQueryDto) {
    return this.getMyReferrals(userId, query);
  }
}
