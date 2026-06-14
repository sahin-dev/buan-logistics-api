import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../authentication/auth.module";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { NotificationListener } from "./notification.listener";

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [NotificationController],
    providers: [NotificationService, NotificationListener],
    exports: [NotificationService],
})
export class NotificationModule {}
