import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "generated/prisma/enums";

export class NotificationResponseDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "Notification unique identifier",
    })
    id!: string;

    @ApiProperty({
        example: "user-123",
        description: "User ID of the recipient (null for system-wide broadcasts)",
        nullable: true,
    })
    userId?: string | null;

    @ApiProperty({
        example: "Shipment Delivered",
        description: "Notification title",
    })
    title!: string;

    @ApiProperty({
        example: "Your shipment with tracker #123 has been successfully delivered.",
        description: "Notification message/content",
    })
    message!: string;

    @ApiProperty({
        enum: NotificationType,
        example: "SHIPMENT",
        description: "Type of notification",
    })
    type!: NotificationType;

    @ApiProperty({
        example: false,
        description: "Whether the notification has been read",
    })
    isRead!: boolean;

    @ApiProperty({
        example: { trackerId: "123", shipmentId: "ship-456" },
        description: "Optional metadata/payload",
        nullable: true,
    })
    metadata?: Record<string, any> | null;

    @ApiProperty({
        example: "2026-07-02T10:30:00Z",
        description: "Timestamp when notification was created",
    })
    createdAt!: Date;

    @ApiProperty({
        example: "2026-07-02T10:30:00Z",
        description: "Timestamp when notification was last updated",
    })
    updatedAt!: Date;
}
