import { IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "currentPassword123",
        description: "User current password",
    })
    currentPassword!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty({
        example: "newPassword123",
        description: "User new password (min 6 characters)",
    })
    newPassword!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty({
        example: "newPassword123",
        description: "Confirm user new password",
    })
    confirmNewPassword!: string;
}
