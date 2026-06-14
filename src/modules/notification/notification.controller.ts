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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { JwtAuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { Role } from "generated/prisma/enums";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    /**
     * Get all notifications for the authenticated user (including system broadcasts)
     */
    @Get("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get notifications for authenticated user (paginated, supports ?page=1&limit=10)" })
    @ApiResponse({ status: 200, description: "Notifications retrieved successfully" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
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
    @ApiOperation({ summary: "Get unread notifications count" })
    @ApiResponse({ status: 200, description: "Count retrieved successfully" })
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
    @ApiOperation({ summary: "Mark a notification as read" })
    @ApiResponse({ status: 200, description: "Notification marked as read successfully" })
    @ApiResponse({ status: 404, description: "Notification not found" })
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
    @ApiOperation({ summary: "Mark all notifications as read" })
    @ApiResponse({ status: 200, description: "All notifications marked as read successfully" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async markAllAsRead(@Request() req: any) {
        const userId = req.payload.userId;
        return this.notificationService.markAllAsRead(userId);
    }

    /**
     * Create a notification (Admin only)
     */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Create a notification for a user (Admin only)" })
    @ApiResponse({ status: 201, description: "Notification created successfully" })
    @ApiResponse({ status: 403, description: "Forbidden" })
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
    @ApiOperation({ summary: "Broadcast system-wide notification (Admin only)" })
    @ApiResponse({ status: 201, description: "Broadcast notification created successfully" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    async createBroadcast(@Body() dto: CreateNotificationDto) {
        return this.notificationService.createBroadcast(dto);
    }

    /**
     * Delete a notification (Admin only)
     */
    @Delete(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Delete a notification (Admin only)" })
    @ApiResponse({ status: 200, description: "Notification deleted successfully" })
    @ApiResponse({ status: 404, description: "Notification not found" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    async deleteNotification(@Param("id") id: string) {
        return this.notificationService.deleteNotification(id);
    }
}
