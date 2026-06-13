import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    private readonly uploadDir = path.join(process.cwd(), "uploads", "avatars");

    constructor(private readonly prismaService: PrismaService) {
        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Create a new user
     * @param data - User data to create
     * @returns Created user
     */
    async createUser(data: {
        email: string;
        password?: string;
        firstName: string;
        lastName: string;
        provider?: string;
    }): Promise<User> {
        try {
            const { email, password, firstName, lastName, provider = "local" } = data;

            // Check if user already exists
            const existingUser = await this.prismaService.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                throw new BadRequestException("User with this email already exists");
            }

            const createdUser = await this.prismaService.user.create({
                data: {
                    email,
                    password,
                    provider,
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

            return createdUser;
        } catch (error) {
            this.logger.error("Error creating user:", error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException("An error occurred while creating the user");
        }
    }

    /**
     * Save or update a user
     * @param user - User data to save
     * @returns Saved user
     */
    async saveUser(user: User): Promise<User> {
        try {
            const createdUser = await this.prismaService.user.create({
                data: user,
            });

            return createdUser;
        } catch (error) {
            this.logger.error("Error saving user:", error);
            throw new InternalServerErrorException("An error occurred while saving the user");
        }
    }

    /**
     * Get user by ID
     * @param userId - User ID
     * @returns User with profile
     */
    async getUserById(userId: string): Promise<User> {
        try {
            const user = await this.prismaService.user.findUnique({
                where: { id: userId },
                include: {
                    profile: true,
                    businessProfile: true,
                    coporatePartnerProfile: true,
                    hubProviderProfile: true,
                },
            });

            if (!user) {
                throw new NotFoundException("User not found");
            }

            return user;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error("Error fetching user:", error);
            throw new InternalServerErrorException("An error occurred while fetching the user");
        }
    }

    /**
     * Update user information
     * @param userId - User ID
     * @param data - Update data
     * @returns Updated user
     */
    async updateUser(
        userId: string,
        data: {
            firstName?: string;
            lastName?: string;
            email?: string;
        },
    ): Promise<User> {
        try {
            // Verify user exists
            await this.getUserById(userId);

            const { firstName, lastName, email } = data;

            // Check if email is being changed to an existing one
            if (email) {
                const existingUser = await this.prismaService.user.findUnique({
                    where: { email },
                });

                if (existingUser && existingUser.id !== userId) {
                    throw new BadRequestException("Email already in use");
                }
            }

            // Update user
            const updatedUser = await this.prismaService.user.update({
                where: { id: userId },
                data: {
                    email,
                    profile: {
                        update: {
                            firstName,
                            lastName,
                            
                        },
                    },
                },
                include: {
                    profile: true,
                },
            });

            return updatedUser;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error("Error updating user:", error);
            throw new InternalServerErrorException("An error occurred while updating the user");
        }
    }

    /**
     * Delete a user
     * @param userId - User ID
     * @returns Deleted user
     */
    async deleteUser(userId: string): Promise<User> {
        try {
            // Verify user exists
            await this.getUserById(userId);

            // Delete user profile first
            await this.prismaService.userProfile.deleteMany({
                where: { userId },
            });

            // Delete user
            const deletedUser = await this.prismaService.user.delete({
                where: { id: userId },
            });

            return deletedUser;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error("Error deleting user:", error);
            throw new InternalServerErrorException("An error occurred while deleting the user");
        }
    }

    /**
     * Block a user
     * @param userId - User ID
     * @returns Updated user
     */
    async blockUser(userId: string): Promise<User> {
        try {
            // Verify user exists
            await this.getUserById(userId);

            // Note: You may need to add an 'isBlocked' field to the User model
            // For now, this is a placeholder implementation
            const blockedUser = await this.prismaService.user.update({
                where: { id: userId },
                data: {
                    // Add isBlocked or status field when added to schema
                },
                include: {
                    profile: true,
                },
            });

            return blockedUser;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error("Error blocking user:", error);
            throw new InternalServerErrorException("An error occurred while blocking the user");
        }
    }

    /**
     * Upload user avatar
     * @param userId - User ID
     * @param file - Uploaded file
     * @returns Updated user profile with avatar
     */
    async uploadAvatar(userId: string, file: any): Promise<any> {
        try {
            // Verify user exists
            const user = await this.getUserById(userId);

            if (!file) {
                throw new BadRequestException("No file provided");
            }

            // Validate file type
            const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if (!allowedMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed");
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new BadRequestException("File size exceeds 5MB limit");
            }

            // Generate unique filename
            const timestamp = Date.now();
            const fileExt = path.extname(file.originalname);
            const filename = `${userId}_${timestamp}${fileExt}`;
            const filepath = path.join(this.uploadDir, filename);

            // Save file
            fs.writeFileSync(filepath, file.buffer);

            const userProfile = await this.prismaService.userProfile.findUnique({
                where: { userId },
            });

            // Delete old avatar if exists
            if (userProfile?.avatar) {
                const oldFilePath = path.join(this.uploadDir, path.basename(userProfile.avatar));
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }

            // Update user profile with new avatar path
            const avatarUrl = `/uploads/avatars/${filename}`;
            const updatedProfile = await this.prismaService.userProfile.update({
                where: { userId },
                data: {
                    avatar: avatarUrl,
                },
            });

            return {
                success: true,
                message: "Avatar uploaded successfully",
                avatar: updatedProfile.avatar,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error("Error uploading avatar:", error);
            throw new InternalServerErrorException("An error occurred while uploading the avatar");
        }
    }

    /**
     * Get all users
     * @returns List of users
     */
    async getAllUsers(): Promise<User[]> {
        try {
            const users = await this.prismaService.user.findMany({
                include: {
                    profile: true,
                    businessProfile: true,
                    coporatePartnerProfile: true,
                    hubProviderProfile: true,
                },
            });

            return users;
        } catch (error) {
            this.logger.error("Error fetching users:", error);
            throw new InternalServerErrorException("An error occurred while fetching users");
        }
    }
}