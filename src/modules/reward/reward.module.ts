import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { RewardListener } from './reward.listener';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../authentication/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RewardController],
  providers: [RewardService, RewardListener],
  exports: [RewardService],
})
export class RewardModule {}
