import { ApiProperty } from "@nestjs/swagger";
import { ApplicationStatus } from "generated/prisma/enums";
import { IsEnum, IsString, IsNotEmpty, IsOptional } from "class-validator";

export class ReviewApplicationDto {
    @ApiProperty({
        enum: ApplicationStatus,
        example: ApplicationStatus.Accepted,
        description: "Application status",
    })
    @IsEnum(ApplicationStatus)
    @IsNotEmpty()
    status: ApplicationStatus

    @ApiProperty({
        example: "Application approved",
        description: "Notes",
        required: false
    })
    @IsString()
    @IsOptional()
    notes?: string
}