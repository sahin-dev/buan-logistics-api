import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { UpdateNotificationDto } from "./dtos/update-notification.dto";
import { NotificationResponseDto } from "./dtos/notification-response.dto";
import { JwtAuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { Role } from "generated/prisma/enums";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    // ==================== USER ENDPOINTS ====================

    /**
     * Get all notifications for the authenticated user (including system broadcasts)
     */
    @Get("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Get notifications for authenticated user",
        description: "Retrieves paginated notifications for the authenticated user, including personal notifications and system-wide broadcasts"
    })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of items per page' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by notification title or message' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by notification type (SYSTEM, SHIPMENT, INVOICE, REWARD, UPGRADE, GENERAL)' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter notifications created on or after this date (ISO 8601 format)' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter notifications created on or before this date (ISO 8601 format)' })
    @ApiResponse({
        status: 200,
        description: "Notifications retrieved successfully",
        schema: {
            example: {
                data: [
                    {
                        id: "550e8400-e29b-41d4-a716-446655440000",
                        userId: "user-123",
                        title: "Shipment Delivered",
                        message: "Your shipment has been delivered",
                        type: "SHIPMENT",
                        isRead: false,
                        metadata: { trackerId: "123" },
                        createdAt: "2026-07-02T10:30:00Z",
                        updatedAt: "2026-07-02T10:30:00Z"
                    }
                ],
                pagination: {
                    totalItems: 1,
                    currentPage: 1,
                    totalPages: 1,
                    itemsPerPage: 10,
                    hasNextPage: false,
                    hasPreviousPage: false
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: "Unauthorized - Invalid or missing token" })
    async getMyNotifications(@Request() req: any, @Query() query: PaginationQueryDto) {
        const userId = req.payload.userId;
        return this.notificationService.getMyNotifications(userId, query);
    }

    /**
     * Get count of unread notifications for the authenticated user
     */
    @Get("me/unread-count")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Get unread notifications count",
        description: "Returns the count of unread notifications for the authenticated user"
    })
    @ApiResponse({
        status: 200,
        description: "Count retrieved successfully",
        schema: {
            example: { count: 5 }
        }
    })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async getUnreadCount(@Request() req: any) {
        const userId = req.payload.userId;
        return this.notificationService.getUnreadCount(userId);
    }

    /**
     * Mark a specific notification as read
     */
    @Patch(":id/read")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'Notification ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiOperation({
        summary: "Mark a notification as read",
        description: "Marks a specific notification as read for the authenticated user"
    })
    @ApiResponse({
        status: 200,
        description: "Notification marked as read successfully",
        type: NotificationResponseDto
    })
    @ApiResponse({ status: 404, description: "Notification not found or doesn't belong to user" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async markAsRead(@Param("id") id: string, @Request() req: any) {
        const userId = req.payload.userId;
        return this.notificationService.markAsRead(id, userId);
    }

    /**
     * Mark all notifications for the authenticated user as read
     */
    @Patch("read-all")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Mark all notifications as read",
        description: "Marks all unread notifications as read for the authenticated user"
    })
    @ApiResponse({
        status: 200,
        description: "All notifications marked as read successfully",
        schema: {
            example: {
                success: true,
                message: "All notifications marked as read"
            }
        }
    })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async markAllAsRead(@Request() req: any) {
        const userId = req.payload.userId;
        return this.notificationService.markAllAsRead(userId);
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Create a notification for a specific user (Admin only)
     */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Create a notification for a user (Admin only)",
        description: "Creates a new notification for a specific user. Requires admin privileges."
    })
    @ApiBody({ type: CreateNotificationDto })
    @ApiResponse({
        status: 201,
        description: "Notification created successfully",
        type: NotificationResponseDto
    })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async createNotification(@Body() dto: CreateNotificationDto) {
        return this.notificationService.createNotification(dto);
    }

    /**
     * Create a system-wide broadcast notification (Admin only)
     */
    @Post("broadcast")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Broadcast system-wide notification (Admin only)",
        description: "Creates a system-wide notification that will be delivered to all users. Requires admin privileges."
    })
    @ApiBody({ type: CreateNotificationDto })
    @ApiResponse({
        status: 201,
        description: "Broadcast notification created successfully",
        type: NotificationResponseDto
    })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async createBroadcast(@Body() dto: CreateNotificationDto) {
        return this.notificationService.createBroadcast(dto);
    }

    /**
     * Get all notifications (Admin only)
     */
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Get all notifications (Admin only)",
        description: "Retrieves all notifications in the system with advanced filtering and pagination. Requires admin privileges."
    })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of items per page' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by notification title or message' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by notification type (SYSTEM, SHIPMENT, INVOICE, REWARD, UPGRADE, GENERAL)' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter notifications created on or after this date (ISO 8601 format)' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter notifications created on or before this date (ISO 8601 format)' })
    @ApiResponse({
        status: 200,
        description: "All notifications retrieved successfully",
        schema: {
            example: {
                data: [
                    {
                        id: "550e8400-e29b-41d4-a716-446655440000",
                        userId: "user-123",
                        title: "Shipment Delivered",
                        message: "Your shipment has been delivered",
                        type: "SHIPMENT",
                        isRead: false,
                        metadata: { trackerId: "123" },
                        createdAt: "2026-07-02T10:30:00Z",
                        updatedAt: "2026-07-02T10:30:00Z",
                        user: {
                            id: "user-123",
                            email: "user@example.com",
                            name: "John Doe"
                        }
                    }
                ],
                pagination: {
                    totalItems: 1,
                    currentPage: 1,
                    totalPages: 1,
                    itemsPerPage: 10,
                    hasNextPage: false,
                    hasPreviousPage: false
                }
            }
        }
    })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async getAllNotifications(@Query() query: PaginationQueryDto) {
        return this.notificationService.getAllNotifications(query);
    }

    /**
     * Get notification statistics (Admin only)
     */
    @Get("admin/stats")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Get notification statistics (Admin only)",
        description: "Retrieves comprehensive statistics about all notifications in the system. Requires admin privileges."
    })
    @ApiResponse({
        status: 200,
        description: "Statistics retrieved successfully",
        schema: {
            example: {
                totalNotifications: 150,
                totalBroadcasts: 10,
                totalUserNotifications: 140,
                unreadCount: 45,
                byType: {
                    SYSTEM: 15,
                    SHIPMENT: 85,
                    INVOICE: 30,
                    REWARD: 15,
                    UPGRADE: 5,
                    GENERAL: 0
                }
            }
        }
    })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async getNotificationStats() {
        return this.notificationService.getNotificationStats();
    }

    /**
     * Get a specific notification by ID (Admin only)
     */
    @Get(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'Notification ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiOperation({
        summary: "Get a specific notification (Admin only)",
        description: "Retrieves details of a specific notification. Requires admin privileges."
    })
    @ApiResponse({
        status: 200,
        description: "Notification retrieved successfully",
        type: NotificationResponseDto
    })
    @ApiResponse({ status: 404, description: "Notification not found" })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async getNotificationById(@Param("id") id: string) {
        return this.notificationService.getNotificationById(id);
    }

    /**
     * Update a notification (Admin only)
     */
    @Patch(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'Notification ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiOperation({
        summary: "Update a notification (Admin only)",
        description: "Updates specific fields of a notification. Requires admin privileges."
    })
    @ApiBody({ type: UpdateNotificationDto })
    @ApiResponse({
        status: 200,
        description: "Notification updated successfully",
        type: NotificationResponseDto
    })
    @ApiResponse({ status: 404, description: "Notification not found" })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async updateNotification(@Param("id") id: string, @Body() dto: UpdateNotificationDto) {
        return this.notificationService.updateNotification(id, dto);
    }

    /**
     * Delete a notification (Admin only)
     */
    @Delete(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'Notification ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiOperation({
        summary: "Delete a notification (Admin only)",
        description: "Permanently deletes a specific notification. Requires admin privileges."
    })
    @ApiResponse({
        status: 200,
        description: "Notification deleted successfully",
        schema: {
            example: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                userId: "user-123",
                title: "Shipment Delivered",
                message: "Your shipment has been delivered",
                type: "SHIPMENT",
                isRead: false,
                metadata: { trackerId: "123" },
                createdAt: "2026-07-02T10:30:00Z",
                updatedAt: "2026-07-02T10:30:00Z"
            }
        }
    })
    @ApiResponse({ status: 404, description: "Notification not found" })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async deleteNotification(@Param("id") id: string) {
        return this.notificationService.deleteNotification(id);
    }

    /**
     * Delete multiple notifications (Admin only)
     */
    @Post("admin/delete-multiple")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Delete multiple notifications (Admin only)",
        description: "Permanently deletes multiple notifications in a single request. Requires admin privileges."
    })
    @ApiBody({
        schema: {
            example: {
                ids: [
                    "550e8400-e29b-41d4-a716-446655440000",
                    "550e8400-e29b-41d4-a716-446655440001"
                ]
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: "Notifications deleted successfully",
        schema: {
            example: {
                count: 2,
                message: "2 notification(s) deleted successfully"
            }
        }
    })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async deleteMultipleNotifications(@Body() dto: { ids: string[] }) {
        return this.notificationService.deleteMultipleNotifications(dto.ids);
    }

    /**
     * Mark multiple notifications as read/unread (Admin only)
     */
    @Patch("admin/mark-multiple")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Mark multiple notifications as read/unread (Admin only)",
        description: "Marks multiple notifications as read or unread in a single request. Requires admin privileges."
    })
    @ApiBody({
        schema: {
            example: {
                ids: [
                    "550e8400-e29b-41d4-a716-446655440000",
                    "550e8400-e29b-41d4-a716-446655440001"
                ],
                isRead: true
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: "Notifications updated successfully",
        schema: {
            example: {
                count: 2,
                message: "2 notification(s) marked as read successfully"
            }
        }
    })
    @ApiResponse({ status: 403, description: "Forbidden - Insufficient permissions" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async markMultipleNotifications(@Body() dto: { ids: string[]; isRead: boolean }) {
        return this.notificationService.markMultipleNotifications(dto.ids, dto.isRead);
    }
}
