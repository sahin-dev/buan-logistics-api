import { IsString, IsOptional, IsEnum, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "generated/prisma/enums";

export class UpdateNotificationDto {
    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "Updated Shipment Status",
        description: "Updated notification title",
        required: false,
    })
    title?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "Your shipment status has been updated to in-transit.",
        description: "Updated notification message",
        required: false,
    })
    message?: string;

    @IsEnum(NotificationType)
    @IsOptional()
    @ApiProperty({
        enum: NotificationType,
        example: "SHIPMENT",
        description: "Updated notification type",
        required: false,
    })
    type?: NotificationType;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        example: true,
        description: "Mark notification as read/unread",
        required: false,
    })
    isRead?: boolean;

    @IsOptional()
    @ApiProperty({
        example: { trackerId: "123", updated: true },
        description: "Updated metadata/payload",
        required: false,
    })
    metadata?: any;
}
