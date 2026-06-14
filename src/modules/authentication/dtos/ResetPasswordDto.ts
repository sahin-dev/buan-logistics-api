import { IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "123456",
        description: "6-digit OTP code received via email",
    })
    token!: string;

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
