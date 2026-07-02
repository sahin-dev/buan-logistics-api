import { Injectable, NotFoundException, InternalServerErrorException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Notification, NotificationType } from "generated/prisma/client";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";
import { PaginatedResponseDto } from "src/common/dtos/paginated-response.dto";

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(private readonly prismaService: PrismaService) {}

    /**
     * Create a notification for a specific user
     */
    async createNotification(dto: CreateNotificationDto): Promise<Notification> {
        try {
            return await this.prismaService.notification.create({
                data: {
                    userId: dto.userId || null,
                    title: dto.title,
                    message: dto.message,
                    type: dto.type,
                    metadata: dto.metadata || null,
                },
            });
        } catch (error) {
            this.logger.error("Error creating notification:", error);
            throw new InternalServerErrorException("An error occurred while creating notification");
        }
    }

    /**
     * Create a system broadcast notification for all users
     */
    async createBroadcast(dto: Omit<CreateNotificationDto, "userId">): Promise<Notification> {
        try {
            return await this.prismaService.notification.create({
                data: {
                    userId: null,
                    title: dto.title,
                    message: dto.message,
                    type: dto.type,
                    metadata: dto.metadata || null,
                },
            });
        } catch (error) {
            this.logger.error("Error creating broadcast notification:", error);
            throw new InternalServerErrorException("An error occurred while creating broadcast notification");
        }
    }

    /**
     * Get all notifications for the authenticated user (both user-specific and system-wide broadcasts) — paginated
     */
    async getMyNotifications(userId: string, query: PaginationQueryDto): Promise<PaginatedResponseDto<Notification>> {
        try {
            const { page, limit, search, status, startDate, endDate } = query;
            const skip = query.getSkip();

            const where: any = {
                OR: [
                    { userId },
                    { userId: null },
                ],
                ...(search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { message: { contains: search, mode: 'insensitive' } },
                    ],
                } : {}),
                ...(status ? { type: status } : {}),
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate ? { gte: new Date(startDate) } : {}),
                        ...(endDate ? { lte: new Date(endDate) } : {}),
                    },
                } : {}),
            };

            const [data, totalItems] = await Promise.all([
                this.prismaService.notification.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prismaService.notification.count({ where }),
            ]);

            return PaginatedResponseDto.create(data, totalItems, page, limit);
        } catch (error) {
            this.logger.error("Error fetching notifications:", error);
            throw new InternalServerErrorException("An error occurred while fetching notifications");
        }
    }

    /**
     * Get the count of unread notifications for a user
     */
    async getUnreadCount(userId: string): Promise<{ count: number }> {
        try {
            const count = await this.prismaService.notification.count({
                where: {
                    OR: [
                        { userId },
                        { userId: null },
                    ],
                    isRead: false,
                },
            });
            return { count };
        } catch (error) {
            this.logger.error("Error counting unread notifications:", error);
            throw new InternalServerErrorException("An error occurred while counting unread notifications");
        }
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<Notification> {
        try {
            const notification = await this.prismaService.notification.findUnique({
                where: { id: notificationId },
            });

            if (!notification) {
                throw new NotFoundException("Notification not found");
            }

            // Ensure the notification belongs to the user (or is a public broadcast)
            if (notification.userId && notification.userId !== userId) {
                throw new NotFoundException("Notification not found for this user");
            }

            return await this.prismaService.notification.update({
                where: { id: notificationId },
                data: { isRead: true },
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error("Error marking notification as read:", error);
            throw new InternalServerErrorException("An error occurred while updating notification");
        }
    }

    /**
     * Mark all notifications for the user as read
     */
    async markAllAsRead(userId: string): Promise<{ success: boolean; message: string }> {
        try {
            await this.prismaService.notification.updateMany({
                where: {
                    OR: [
                        { userId },
                        { userId: null },
                    ],
                    isRead: false,
                },
                data: { isRead: true },
            });

            return {
                success: true,
                message: "All notifications marked as read",
            };
        } catch (error) {
            this.logger.error("Error marking all notifications as read:", error);
            throw new InternalServerErrorException("An error occurred while updating notifications");
        }
    }

    /**
     * Delete a notification (Admin only)
     */
    async deleteNotification(notificationId: string): Promise<Notification> {
        try {
            const notification = await this.prismaService.notification.findUnique({
                where: { id: notificationId },
            });

            if (!notification) {
                throw new NotFoundException("Notification not found");
            }

            return await this.prismaService.notification.delete({
                where: { id: notificationId },
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error("Error deleting notification:", error);
            throw new InternalServerErrorException("An error occurred while deleting notification");
        }
    }

    /**
     * Get all notifications (Admin only) — paginated with advanced filtering
     */
    async getAllNotifications(query: PaginationQueryDto): Promise<PaginatedResponseDto<Notification>> {
        try {
            const { page, limit, search, status, startDate, endDate } = query;
            const skip = query.getSkip();

            const where: any = {
                ...(search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { message: { contains: search, mode: 'insensitive' } },
                    ],
                } : {}),
                ...(status ? { type: status } : {}),
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate ? { gte: new Date(startDate) } : {}),
                        ...(endDate ? { lte: new Date(endDate) } : {}),
                    },
                } : {}),
            };

            const [data, totalItems] = await Promise.all([
                this.prismaService.notification.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                profile: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    }
                                }
                            },
                        },
                    },
                }),
                this.prismaService.notification.count({ where }),
            ]);

            return PaginatedResponseDto.create(data, totalItems, page, limit);
        } catch (error) {
            this.logger.error("Error fetching all notifications:", error);
            throw new InternalServerErrorException("An error occurred while fetching notifications");
        }
    }

    /**
     * Get a specific notification by ID (Admin only)
     */
    async getNotificationById(notificationId: string): Promise<any> {
        try {
            const notification = await this.prismaService.notification.findUnique({
                where: { id: notificationId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        },
                    },
                },
            });

            if (!notification) {
                throw new NotFoundException("Notification not found");
            }

            return notification;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error("Error fetching notification:", error);
            throw new InternalServerErrorException("An error occurred while fetching notification");
        }
    }

    /**
     * Update a notification (Admin only)
     */
    async updateNotification(notificationId: string, dto: any): Promise<Notification> {
        try {
            const notification = await this.prismaService.notification.findUnique({
                where: { id: notificationId },
            });

            if (!notification) {
                throw new NotFoundException("Notification not found");
            }

            return await this.prismaService.notification.update({
                where: { id: notificationId },
                data: {
                    ...(dto.title && { title: dto.title }),
                    ...(dto.message && { message: dto.message }),
                    ...(dto.type && { type: dto.type }),
                    ...(dto.isRead !== undefined && { isRead: dto.isRead }),
                    ...(dto.metadata !== undefined && { metadata: dto.metadata }),
                },
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error("Error updating notification:", error);
            throw new InternalServerErrorException("An error occurred while updating notification");
        }
    }

    /**
     * Get notification statistics (Admin only)
     */
    async getNotificationStats(): Promise<{
        totalNotifications: number;
        totalBroadcasts: number;
        totalUserNotifications: number;
        unreadCount: number;
        byType: Record<string, number>;
    }> {
        try {
            const totalNotifications = await this.prismaService.notification.count();
            const totalBroadcasts = await this.prismaService.notification.count({
                where: { userId: null },
            });
            const totalUserNotifications = await this.prismaService.notification.count({
                where: { userId: { not: null } },
            });
            const unreadCount = await this.prismaService.notification.count({
                where: { isRead: false },
            });

            const byTypeData = await this.prismaService.notification.groupBy({
                by: ['type'],
                _count: true,
            });

            const byType: Record<string, number> = {};
            byTypeData.forEach((item: any) => {
                byType[item.type] = item._count;
            });

            return {
                totalNotifications,
                totalBroadcasts,
                totalUserNotifications,
                unreadCount,
                byType,
            };
        } catch (error) {
            this.logger.error("Error fetching notification stats:", error);
            throw new InternalServerErrorException("An error occurred while fetching notification stats");
        }
    }

    /**
     * Delete multiple notifications (Admin only)
     */
    async deleteMultipleNotifications(ids: string[]): Promise<{ count: number; message: string }> {
        try {
            const result = await this.prismaService.notification.deleteMany({
                where: { id: { in: ids } },
            });

            return {
                count: result.count,
                message: `${result.count} notification(s) deleted successfully`,
            };
        } catch (error) {
            this.logger.error("Error deleting multiple notifications:", error);
            throw new InternalServerErrorException("An error occurred while deleting notifications");
        }
    }

    /**
     * Mark multiple notifications as read/unread (Admin only)
     */
    async markMultipleNotifications(ids: string[], isRead: boolean): Promise<{ count: number; message: string }> {
        try {
            const result = await this.prismaService.notification.updateMany({
                where: { id: { in: ids } },
                data: { isRead },
            });

            const action = isRead ? "marked as read" : "marked as unread";
            return {
                count: result.count,
                message: `${result.count} notification(s) ${action} successfully`,
            };
        } catch (error) {
            this.logger.error("Error updating multiple notifications:", error);
            throw new InternalServerErrorException("An error occurred while updating notifications");
        }
    }
}
