import { Module } from "@nestjs/common";
import { AuthModule } from "../authentication/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}