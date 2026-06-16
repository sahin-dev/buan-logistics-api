import { Injectable, BadRequestException, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordHasher } from "./utils/PasswordHasher";
import { RegisterUserDto } from "./dtos/RegisterUserDto";
import { SignInUserDto } from "./dtos/SignInUserDto";
import { AuthResponseDto } from "./dtos/AuthResponseDto";
import { SmtpProvider } from "src/common/providers/smtp.provider";
import { ChangePasswordDto } from "./dtos/ChangePasswordDto";
import { ResetPasswordDto } from "./dtos/ResetPasswordDto";
import { mapRoleByTier, mapUserResponse } from "src/common/utils/role-mapper.util";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly passwordHasher: PasswordHasher,
        private readonly jwtService: JwtService,
        private readonly smtpProvider: SmtpProvider,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Register a new user
     * @param registerUserDto - User registration data
     * @returns AuthResponseDto with token and user info
     */
    async register(registerUserDto: RegisterUserDto): Promise<AuthResponseDto> {
        const { email, password, confirmPassword, firstName, lastName } = registerUserDto;

        // Validate passwords match
        if (password !== confirmPassword) {
            throw new BadRequestException("Passwords does not matched!");
        }

        // Check if email already exists
        const isEmailUnique = await this.checkEmailUniqueness(email);
        if (!isEmailUnique) {
            throw new BadRequestException("Email is already in use");
        }

        try {
            // Hash password
            const hashedPassword = await this.passwordHasher.hashPassword(password);

            // Create user with profile
            const user = await this.prismaService.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    provider: "local",
                    role: "USER",
                    profile: {
                        create: {
                            firstName,
                            lastName,
                        },
                    },
                },
                include: {
                    profile: true,
                },
            });

            // Emit user.registered event to notify other modules (like Referral, Notifications)
            this.eventEmitter.emit("user.registered", {
                userId: user.id,
                email: user.email,
                referralCode: registerUserDto.referralCode,
            });

            // Generate JWT token
            const token = this.generateToken(user.id, user.role);

            return {
                token,
                email: user.email,
                role: mapRoleByTier(user.role, user.tier),
            };
        } catch (error) {
            this.logger.error("Error registering user:", error);
            throw new BadRequestException("Failed to register user");
        }
    }

    /**
     * Sign in a user
     * @param signInUserDto - User sign in credentials
     * @returns AuthResponseDto with token and user info
     */
    async signin(signInUserDto: SignInUserDto): Promise<AuthResponseDto> {
        const { email, password } = signInUserDto;

        try {
            // Find user by email
            const user = await this.prismaService.user.findUnique({
                where: { email },
                include: {
                    profile: true,
                },
            });

            if (!user) {
                throw new UnauthorizedException("Invalid email or password");
            }

            // Verify password
            const isPasswordValid = await this.passwordHasher.comparePassword(
                password,
                user.password!,
            );

            if (!isPasswordValid) {
                throw new UnauthorizedException("Invalid email or password");
            }

            // // Verify role matches
            // if (user.role.toLowerCase() !== role.toLowerCase()) {
            //     throw new UnauthorizedException("Invalid role");
            // }

            // Generate JWT token
            const token = this.generateToken(user.id, user.role);

            return {
                token,
                email: user.email,
                role: mapRoleByTier(user.role, user.tier),
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error("Error signing in user:", error);
            throw new BadRequestException("Failed to sign in");
        }
    }



    /**
     * Generate JWT token for a user
     * @param userId - User ID
     * @param role - User role
     * @returns JWT token string
     */
    generateToken(userId: string, role: string): string {
        const payload = {
            sub: userId,
            role: role,
        };
        return this.jwtService.sign(payload);
    }

    async checkEmailUniqueness(email: string): Promise<boolean> {
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });
        return !existingUser;
    }

    /**
     * Change password for the authenticated user
     */
    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ success: boolean; message: string }> {
        const { currentPassword, newPassword, confirmNewPassword } = changePasswordDto;

        if (newPassword !== confirmNewPassword) {
            throw new BadRequestException("New passwords do not match");
        }

        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.password) {
            throw new BadRequestException("User not found or has no password set");
        }

        const isPasswordValid = await this.passwordHasher.comparePassword(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new BadRequestException("Incorrect current password");
        }

        const hashedNewPassword = await this.passwordHasher.hashPassword(newPassword);

        await this.prismaService.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });

        return {
            success: true,
            message: "Password changed successfully",
        };
    }

    /**
     * Request a password reset OTP code
     */
    async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
        const user = await this.prismaService.user.findUnique({
            where: { email },
        });

        // For security, don't expose if user exists or not, but return the same message
        if (!user) {
            return {
                success: true,
                message: "If the email is registered, a password reset code has been sent",
            };
        }

        // Generate a 6-digit OTP token
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

        // Store reset token
        await this.prismaService.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
            },
        });

        // Send Email
        await this.smtpProvider.sendMail({
            to: email,
            subject: "Buan Logistics - Password Reset Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #1a73e8; text-align: center;">Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your Buan Logistics account.</p>
                    <p>Your password reset code is:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background-color: #f1f3f4; padding: 10px 20px; border-radius: 5px; color: #202124;">${token}</span>
                    </div>
                    <p style="color: #5f6368; font-size: 12px;">This code is valid for 15 minutes. If you did not make this request, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #e0e0e0;" />
                    <p style="color: #9aa0a6; font-size: 11px; text-align: center;">Buan Logistics API Service</p>
                </div>
            `,
        });

        return {
            success: true,
            message: "If the email is registered, a password reset code has been sent",
        };
    }

    /**
     * Reset password using OTP code
     */
    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
        const { token, newPassword, confirmNewPassword } = resetPasswordDto;

        if (newPassword !== confirmNewPassword) {
            throw new BadRequestException("New passwords do not match");
        }

        const resetToken = await this.prismaService.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
            throw new BadRequestException("Invalid, expired, or already used reset code");
        }

        // Mark token as used
        await this.prismaService.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { used: true },
        });

        const hashedNewPassword = await this.passwordHasher.hashPassword(newPassword);

        await this.prismaService.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedNewPassword },
        });

        return {
            success: true,
            message: "Password has been reset successfully",
        };
    }

    /**
     * Get user details and profile details for an authenticated user
     * @param userId - ID of the authenticated user
     * @returns User object with profile details and without the password field
     */
    async getProfile(userId: string) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException("User not found");
        }

        // Exclude password field from the response
        const { password, ...userWithoutPassword } = user;
        return mapUserResponse(userWithoutPassword);
    }
}