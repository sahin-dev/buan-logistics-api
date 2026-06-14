import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "generated/prisma/enums";

export class CreateNotificationDto {
    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "user-id-uuid",
        description: "User ID receiving the notification. Leave empty for system-wide broadcast.",
        required: false,
    })
    userId?: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "Shipment Delivered",
        description: "Notification title",
    })
    title!: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "Your shipment with tracker #123 has been successfully delivered.",
        description: "Notification content/message",
    })
    message!: string;

    @IsEnum(NotificationType)
    @IsNotEmpty()
    @ApiProperty({
        enum: NotificationType,
        example: "SHIPMENT",
        description: "Type of notification",
    })
    type!: NotificationType;

    @IsOptional()
    @ApiProperty({
        example: { trackerId: "123" },
        description: "Optional payload/metadata in JSON format",
        required: false,
    })
    metadata?: any;
}
