import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { ReferralListener } from './referral.listener';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardModule } from '../reward/reward.module';

@Module({
  imports: [PrismaModule, RewardModule],
  controllers: [ReferralController],
  providers: [ReferralService, ReferralListener],
  exports: [ReferralService],
})
export class ReferralModule {}
