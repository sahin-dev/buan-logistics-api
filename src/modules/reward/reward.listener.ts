import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RewardService } from './reward.service';
import { ShipmentStatus } from 'generated/prisma/enums';

@Injectable()
export class RewardListener {
  private readonly logger = new Logger(RewardListener.name);

  constructor(private readonly rewardService: RewardService) {}

  @OnEvent('shipment.status_updated')
  async handleShipmentStatusUpdated(payload: {
    shipmentId: string;
    senderId: string;
    status: ShipmentStatus;
    notes?: string;
  }) {
    const { shipmentId, senderId, status } = payload;

    if (status !== ShipmentStatus.DELIVERED) {
      return;
    }

    try {
      this.logger.log(`Awarding reward points for delivered shipment ${shipmentId}`);
      await this.rewardService.awardReward(shipmentId, senderId);
    } catch (error) {
      this.logger.error(`Failed to award reward for shipment ${shipmentId}:`, error);
    }
  }
}
