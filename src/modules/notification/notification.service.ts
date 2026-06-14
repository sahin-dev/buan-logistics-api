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
            const { page, limit } = query;
            const skip = query.getSkip();

            const where = {
                OR: [
                    { userId },
                    { userId: null },
                ],
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
}
