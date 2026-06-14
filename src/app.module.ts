import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/authentication/auth.module';
import { UserModule } from './modules/user/user.module';
import { BranchModule } from './modules/branch/branch.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { RewardModule } from './modules/reward/reward.module';
import { ShipmentModule } from './modules/shipment/shipment.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReferralModule } from './modules/referral/referral.module';
import dbConfig from './config/db.config';
import smtpConfig from './config/smtp.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load:[dbConfig, smtpConfig]
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    BranchModule,
    InvoiceModule,
    RewardModule,
    ShipmentModule,
    DashboardModule,
    NotificationModule,
    ReferralModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
