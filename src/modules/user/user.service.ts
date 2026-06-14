import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "generated/prisma/client";
import * as fs from "fs";
import * as path from "path";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";
import { PaginatedResponseDto } from "src/common/dtos/paginated-response.dto";

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    private readonly uploadDir = path.join(process.cwd(), "uploads", "avatars");

    constructor(
        private readonly prismaService: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {
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
            phone?: string;
            address?: string;
        },
    ): Promise<User> {
        try {
            // Verify user exists
            await this.getUserById(userId);

            const { firstName, lastName, email, phone, address } = data;

            // Check if email is being changed to an existing one
            if (email) {
                const existingUser = await this.prismaService.user.findUnique({
                    where: { email },
                });

                if (existingUser && existingUser.id !== userId) {
                    throw new BadRequestException("Email already in use");
                }
            }

            // Build profile update data — only include fields that were provided
            const profileUpdateData: Record<string, any> = {};
            if (firstName !== undefined) profileUpdateData.firstName = firstName;
            if (lastName !== undefined) profileUpdateData.lastName = lastName;
            if (phone !== undefined) profileUpdateData.phone = phone;
            if (address !== undefined) profileUpdateData.address = address;

            // Update user
            const updatedUser = await this.prismaService.user.update({
                where: { id: userId },
                data: {
                    ...(email && { email }),
                    profile: {
                        update: profileUpdateData,
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
     * Get all users (paginated)
     */
    async getAllUsers(query: PaginationQueryDto): Promise<PaginatedResponseDto<User>> {
        try {
            const { page, limit, search } = query;
            const skip = query.getSkip();

            const where: any = search
                ? {
                      OR: [
                          { email: { contains: search, mode: 'insensitive' } },
                          { profile: { firstName: { contains: search, mode: 'insensitive' } } },
                          { profile: { lastName: { contains: search, mode: 'insensitive' } } },
                      ],
                  }
                : {};

            const [users, totalItems] = await Promise.all([
                this.prismaService.user.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        profile: true,
                        businessProfile: true,
                        coporatePartnerProfile: true,
                        hubProviderProfile: true,
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prismaService.user.count({ where }),
            ]);

            return PaginatedResponseDto.create(users, totalItems, page, limit);
        } catch (error) {
            this.logger.error("Error fetching users:", error);
            throw new InternalServerErrorException("An error occurred while fetching users");
        }
    }

    /**
     * Update the authenticated user's own profile
     * Handles avatar, firstName, lastName, phone, and address
     * @param userId - Authenticated user ID
     * @param data - Profile update data
     * @param file - Optional avatar file
     * @returns Updated user with profile
     */
    async updateMyProfile(
        userId: string,
        data: {
            firstName?: string;
            lastName?: string;
            phone?: string;
            address?: string;
        },
        file?: any,
    ): Promise<User> {
        try {
            // Verify user exists
            await this.getUserById(userId);

            // Handle avatar upload if file is provided
            let avatarUrl: string | undefined;
            if (file) {
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

                // Delete old avatar if exists
                const userProfile = await this.prismaService.userProfile.findUnique({
                    where: { userId },
                });

                if (userProfile?.avatar) {
                    const oldFilePath = path.join(this.uploadDir, path.basename(userProfile.avatar));
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                }

                avatarUrl = `/uploads/avatars/${filename}`;
            }

            // Build profile update data — only include fields that were provided
            const profileUpdateData: Record<string, any> = {};
            if (data.firstName !== undefined) profileUpdateData.firstName = data.firstName;
            if (data.lastName !== undefined) profileUpdateData.lastName = data.lastName;
            if (data.phone !== undefined) profileUpdateData.phone = data.phone;
            if (data.address !== undefined) profileUpdateData.address = data.address;
            if (avatarUrl !== undefined) profileUpdateData.avatar = avatarUrl;

            // Update user profile
            const updatedUser = await this.prismaService.user.update({
                where: { id: userId },
                data: {
                    profile: {
                        update: profileUpdateData,
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
            this.logger.error("Error updating profile:", error);
            throw new InternalServerErrorException("An error occurred while updating the profile");
        }
    }

    async applyForUpgrade(userId: string, targetTier: any) {
        const app = await this.prismaService.upgradeApplication.create({
            data: {
                userId,
                targetTier,
                status: 'Pending',
            },
        });

        this.eventEmitter.emit('user.application_submitted', {
            userId,
            applicationType: 'UPGRADE',
            applicationId: app.id,
        });

        return app;
    }

    async applyForHubProvider(dto: any) {
        const app = await this.prismaService.hubProviderApplication.create({
            data: {
                ...dto,
                email_active_window_from: new Date(dto.email_active_window_from),
                email_active_window_to: new Date(dto.email_active_window_to),
                status: 'Pending',
            },
        });

        this.eventEmitter.emit('user.application_submitted', {
            userId: dto.ownerEmail,
            applicationType: 'HUB_PROVIDER',
            applicationId: app.id,
        });

        return app;
    }

    async getUpgradeApplications(query: PaginationQueryDto) {
        const { page, limit } = query;
        const skip = query.getSkip();

        const [data, totalItems] = await Promise.all([
            this.prismaService.upgradeApplication.findMany({
                skip,
                take: limit,
                include: { user: { include: { profile: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prismaService.upgradeApplication.count(),
        ]);

        return PaginatedResponseDto.create(data, totalItems, page, limit);
    }

    async getHubProviderApplications(query: PaginationQueryDto) {
        const { page, limit } = query;
        const skip = query.getSkip();

        const [data, totalItems] = await Promise.all([
            this.prismaService.hubProviderApplication.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prismaService.hubProviderApplication.count(),
        ]);

        return PaginatedResponseDto.create(data, totalItems, page, limit);
    }

    async reviewUpgradeApplication(id: string, status: any, notes?: string) {
        const app = await this.prismaService.upgradeApplication.findUnique({
            where: { id },
        });
        if (!app) {
            throw new NotFoundException(`Upgrade application with ID ${id} not found`);
        }

        const updatedApp = await this.prismaService.upgradeApplication.update({
            where: { id },
            data: {
                status,
                notes,
            },
        });

        if (status === 'Accepted') {
            await this.prismaService.user.update({
                where: { id: app.userId },
                data: { tier: app.targetTier },
            });
        }

        this.eventEmitter.emit('user.application_reviewed', {
            userId: app.userId,
            applicationType: 'UPGRADE',
            applicationId: id,
            status,
            notes,
        });

        return updatedApp;
    }

    async reviewHubProviderApplication(id: string, status: any, notes?: string) {
        const app = await this.prismaService.hubProviderApplication.findUnique({
            where: { id },
        });
        if (!app) {
            throw new NotFoundException(`Hub Provider application with ID ${id} not found`);
        }

        const data: any = {
            status,
            rejection_notes: status === 'Rejected' ? notes : null,
        };
        if (status === 'Accepted') {
            data.accepted_at = new Date();
        } else if (status === 'Rejected') {
            data.rejected_at = new Date();
        }

        const updatedApp = await this.prismaService.hubProviderApplication.update({
            where: { id },
            data,
        });

        if (status === 'Accepted') {
            // Find user by ownerEmail or email and update role to HUB_PROIVDER
            const user = await this.prismaService.user.findFirst({
                where: {
                    OR: [
                        { email: app.ownerEmail },
                        { email: app.email },
                    ],
                },
            });

            if (user) {
                await this.prismaService.user.update({
                    where: { id: user.id },
                    data: { role: 'HUB_PROIVDER' },
                });
            }
        }

        this.eventEmitter.emit('user.application_reviewed', {
            userId: app.ownerEmail, // use email as identifier (no userId on hub app)
            applicationType: 'HUB_PROVIDER',
            applicationId: id,
            status,
            notes,
        });

        return updatedApp;
    }

    async applyForCorporatePartner(userId: string, dto: any) {
        // Check if user already has a pending application
        const existingApp = await this.prismaService.corporatePartnerApplication.findUnique({
            where: { userId },
        });

        if (existingApp && existingApp.status === 'Pending') {
            throw new BadRequestException('You already have a pending corporate partner application.');
        }

        const app = await this.prismaService.corporatePartnerApplication.upsert({
            where: { userId },
            create: {
                userId,
                ...dto,
                status: 'Pending',
            },
            update: {
                ...dto,
                status: 'Pending',
                rejectionNotes: null,
            },
        });

        this.eventEmitter.emit('user.application_submitted', {
            userId,
            applicationType: 'CORPORATE',
            applicationId: app.id,
        });

        return app;
    }

    async getCorporatePartnerApplications(query: PaginationQueryDto) {
        const { page, limit } = query;
        const skip = query.getSkip();

        const [data, totalItems] = await Promise.all([
            this.prismaService.corporatePartnerApplication.findMany({
                skip,
                take: limit,
                include: { user: { include: { profile: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prismaService.corporatePartnerApplication.count(),
        ]);

        return PaginatedResponseDto.create(data, totalItems, page, limit);
    }

    async reviewCorporatePartnerApplication(id: string, status: any, notes?: string) {
        const app = await this.prismaService.corporatePartnerApplication.findUnique({
            where: { id },
        });
        if (!app) {
            throw new NotFoundException(`Corporate partner application with ID ${id} not found`);
        }

        const updatedApp = await this.prismaService.corporatePartnerApplication.update({
            where: { id },
            data: {
                status,
                rejectionNotes: status === 'Rejected' ? notes : null,
            },
        });

        if (status === 'Accepted') {
            // Update user role to CORPORATE_PARTNER
            await this.prismaService.user.update({
                where: { id: app.userId },
                data: { role: 'CORPORATE_PARTNER' },
            });

            // Create or update CorporatePartnerProfile
            await this.prismaService.corporatePartnerProfile.upsert({
                where: { userId: app.userId },
                create: {
                    userId: app.userId,
                    companyName: app.companyName,
                    tradingName: app.tradingName,
                    regNo: app.regNo,
                    country: app.country,
                    address: app.address,
                    yearsInOperation: app.yearsInOperation,
                    contactName: app.contactName,
                    contactPosition: app.contactPosition,
                    contactPhone: app.contactPhone,
                    contactEmail: app.contactEmail,
                    website: app.website,
                    businessNature: app.businessNature,
                    countriesOperateFrom: app.countriesOperateFrom,
                    countriesShipTo: app.countriesShipTo,
                    cargoTypes: app.cargoTypes,
                    estimatedMonthlyVolume: app.estimatedMonthlyVolume,
                    servicesRequired: app.servicesRequired,
                },
                update: {
                    companyName: app.companyName,
                    tradingName: app.tradingName,
                    regNo: app.regNo,
                    country: app.country,
                    address: app.address,
                    yearsInOperation: app.yearsInOperation,
                    contactName: app.contactName,
                    contactPosition: app.contactPosition,
                    contactPhone: app.contactPhone,
                    contactEmail: app.contactEmail,
                    website: app.website,
                    businessNature: app.businessNature,
                    countriesOperateFrom: app.countriesOperateFrom,
                    countriesShipTo: app.countriesShipTo,
                    cargoTypes: app.cargoTypes,
                    estimatedMonthlyVolume: app.estimatedMonthlyVolume,
                    servicesRequired: app.servicesRequired,
                },
            });
        }

        this.eventEmitter.emit('user.application_reviewed', {
            userId: app.userId,
            applicationType: 'CORPORATE',
            applicationId: id,
            status,
            notes,
        });

        return updatedApp;
    }
}