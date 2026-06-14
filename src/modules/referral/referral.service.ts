import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../reward/reward.service';
import { RewardSource } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dtos/paginated-response.dto';

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
  ) {}

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

    // Generate unique referral code
    let referralCode = '';
    let codeExists = true;
    while (codeExists) {
      referralCode = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const existingCode = await this.prisma.referral.findUnique({
        where: { referralCode },
      });
      if (!existingCode) {
        codeExists = false;
      }
    }

    return this.prisma.referral.create({
      data: {
        referrerUserId,
        referredEmail: trimmedEmail,
        referralCode,
        status: 'PENDING',
      },
    });
  }

  async getMyReferrals(userId: string, query: PaginationQueryDto) {
    const { page, limit } = query;
    const skip = query.getSkip();

    const where = { referrerUserId: userId };
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
    const trimmedEmail = userEmail.trim().toLowerCase();

    const referral = await this.prisma.referral.findUnique({
      where: { referralCode },
    });

    if (!referral) {
      return { success: false, message: 'Invalid referral code.' };
    }

    if (referral.status !== 'PENDING') {
      return { success: false, message: 'Referral code has already been used or expired.' };
    }

    if (referral.referredEmail !== trimmedEmail) {
      return { success: false, message: 'This referral code was issued for a different email address.' };
    }

    // Update referral
    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredUserId,
        status: 'COMPLETED',
        rewardPoints: 20.0,
      },
    });

    // Award points to referrer (20 points)
    await this.rewardService.awardPoints(
      referral.referrerUserId,
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
}
