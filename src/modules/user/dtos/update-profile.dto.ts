import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "John",
        description: "User first name",
        required: false,
    })
    firstName?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "Doe",
        description: "User last name",
        required: false,
    })
    lastName?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "+1234567890",
        description: "User phone number",
        required: false,
    })
    phone?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "123 Main St, Springfield, IL 62701",
        description: "User address",
        required: false,
    })
    address?: string;

    @IsOptional()
    @ApiProperty({
        type: "string",
        format: "binary",
        description: "Avatar image file (JPEG, PNG, GIF, WebP — max 5 MB)",
        required: false,
    })
    avatar?: any;
}
