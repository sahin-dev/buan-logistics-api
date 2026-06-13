import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { PasswordHasher } from "./utils/PasswordHasher";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

/**
 * Authentication Module
 * Handles user registration and sign-in
 * Provides JWT token generation and password hashing utilities
 */
@Module({
    imports: [
        PrismaModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || "your-secret-key",
            signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || "7d" as any },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, PasswordHasher],
    exports: [AuthService, PasswordHasher, JwtModule],
})
export class AuthModule {}