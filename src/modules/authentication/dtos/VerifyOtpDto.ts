import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "123456",
        description: "6-digit OTP code received via email",
    })
    token!: string;
}
