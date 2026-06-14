import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RewardService } from './reward.service';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiTags('Rewards')
@Controller('rewards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get rewards for the logged-in user (paginated, supports ?page=1&limit=10)' })
  async getMyRewards(@Request() req: any, @Query() query: PaginationQueryDto) {
    const userId = req.payload.userId;
    return this.rewardService.getRewardsByUserId(userId, query);
  }

  @Get('loyalty-tier')
  @ApiOperation({ summary: 'Get loyalty tier and total points of the logged-in user' })
  async getMyLoyaltyTier(@Request() req: any) {
    const userId = req.payload.userId;
    return this.rewardService.getLoyaltyTier(userId);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem reward points for a discount amount' })
  async redeemRewards(@Request() req: any, @Body('points') points: number) {
    const userId = req.payload.userId;
    return this.rewardService.redeemPoints(userId, points);
  }
}
