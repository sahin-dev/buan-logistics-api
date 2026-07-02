import { Controller, Get, Post, Body, UseGuards, Request, Query, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam, ApiProperty, ApiQuery } from '@nestjs/swagger';
import { RewardService } from './reward.service';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role, RewardType } from 'generated/prisma/enums';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

class RedeemRewardDto {
  @ApiProperty({ description: 'The reward ID to redeem', example: 'reward_123' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  rewardId: string;

  @ApiProperty({ description: 'The invoice ID to apply the reward discount to', example: 'invoice_456', required: false })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  invoiceId?: string;
}

class UpdateRewardRuleDto {
  @ApiProperty({ description: 'Reward type to create or update', enum: RewardType, example: RewardType.AIR_CARGO })
  rewardType: RewardType;

  @ApiProperty({ description: 'Display name for the reward rule', example: 'Air Cargo Reward' })
  name: string;

  @ApiProperty({ description: 'Description of the reward rule', required: false, example: 'Unlock after 2 deliveries' })
  description?: string;

  @ApiProperty({ description: 'Required completed deliveries for count-based rewards', required: false, example: 2 })
  thresholdCount?: number;

  @ApiProperty({ description: 'Required accumulated weight for weight-based rewards', required: false, example: 100 })
  thresholdWeight?: number;

  @ApiProperty({ description: 'Discount percentage applied when the reward is redeemed', required: false, example: 10 })
  discountPercent?: number;

  @ApiProperty({ description: 'Whether the reward grants a free shipment', required: false, example: false })
  freeShipment?: boolean;

  @ApiProperty({ description: 'Maximum free weight allowance when freeShipment is enabled', required: false, example: 0 })
  freeKgLimit?: number;

  @ApiProperty({ description: 'Whether the rule is active', required: false, example: true })
  isActive?: boolean;
}

class ToggleRewardRuleDto {
  @ApiProperty({ description: 'Whether the reward rule should be active', example: true })
  isActive: boolean;
}

@ApiTags('Rewards')
@Controller('rewards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get rewards for the logged-in user (paginated, supports search and filters)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by reward description' })
  @ApiQuery({ name: 'rewardType', required: false, enum: RewardType, description: 'Filter by reward type' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by claimed/unclaimed status' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter createdAt on or after this date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter createdAt on or before this date' })
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
  @ApiOperation({ summary: 'Redeem an unlocked reward against an invoice' })
  @ApiBody({ type: RedeemRewardDto, description: 'Reward redemption request payload' })
  async redeemRewards(@Request() req: any, @Body() body: RedeemRewardDto) {
    const userId = req.payload.userId;
    return this.rewardService.redeemReward(userId, body.rewardId, body.invoiceId);
  }

  @Get('my-progress')
  @ApiOperation({ summary: 'Get the logged-in user reward progress for all enabled reward types' })
  async getMyRewardProgress(@Request() req: any) {
    const userId = req.payload.userId;
    return this.rewardService.getUserRewardProgress(userId);
  }

  @Get('rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all reward rules (Admin only)' })
  async getRewardRules() {
    return this.rewardService.getRewardRules();
  }

  @Post('rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create or update a reward rule (Admin only)' })
  @ApiBody({ type: UpdateRewardRuleDto, description: 'Reward rule payload' })
  async upsertRewardRule(@Body() body: UpdateRewardRuleDto) {
    return this.rewardService.createOrUpdateRewardRule(body);
  }

  @Patch('rules/:rewardType')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle reward rule activation (Admin only)' })
  @ApiParam({ name: 'rewardType', enum: RewardType, description: 'Reward type to toggle' })
  @ApiBody({ type: ToggleRewardRuleDto, description: 'Activation state for the reward rule' })
  async toggleRewardRule(@Param('rewardType') rewardType: RewardType, @Body() body: ToggleRewardRuleDto) {
    return this.rewardService.createOrUpdateRewardRule({ rewardType, name: rewardType, isActive: body.isActive });
  }
}
