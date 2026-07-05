import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiTags('Referrals')
@Controller('referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Invite a friend by email' })
  async inviteFriend(@Request() req: any, @Body('email') email: string) {
    const userId = req.payload.userId;
    return this.referralService.createReferralInvite(userId, email);
  }

  @Get('my/code')
  @ApiOperation({ summary: 'Get the logged-in user unique referral code' })
  async getMyReferralCode(@Request() req: any) {
    return this.referralService.getMyReferralCode(req.payload.userId);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply a referral code to the logged-in user' })
  async applyReferralCode(@Request() req: any, @Body('referralCode') referralCode: string) {
    return this.referralService.applyReferralCode(
      req.payload.userId,
      req.payload.username || req.payload.email || '',
      referralCode,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Referral dashboard data for the logged-in user' })
  async getDashboard(@Request() req: any) {
    return this.referralService.getDashboard(req.payload.userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get list of referrals sent by the logged-in user (paginated, supports search and filters)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by referred email' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by referral status' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter createdAt on or after this date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter createdAt on or before this date' })
  async getMyReferrals(@Request() req: any, @Query() query: PaginationQueryDto) {
    const userId = req.payload.userId;
    return this.referralService.getMyReferrals(userId, query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Referral history for the logged-in user' })
  async getReferralHistory(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.referralService.getReferralHistory(req.payload.userId, query);
  }
}
