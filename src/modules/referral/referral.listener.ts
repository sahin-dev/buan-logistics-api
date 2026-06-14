import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReferralService } from './referral.service';

@Injectable()
export class ReferralListener {
  private readonly logger = new Logger(ReferralListener.name);

  constructor(private readonly referralService: ReferralService) {}

  @OnEvent('user.registered')
  async handleUserRegistered(payload: { userId: string; email: string; referralCode?: string }) {
    const { userId, email, referralCode } = payload;
    if (!referralCode) {
      return;
    }

    try {
      this.logger.log(`Processing referral code "${referralCode}" for registered user ${email}`);
      await this.referralService.applyReferralCode(userId, email, referralCode);
    } catch (error) {
      this.logger.error(`Failed to apply referral code for user ${userId}:`, error);
    }
  }
}
