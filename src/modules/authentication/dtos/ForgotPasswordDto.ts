import { IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({
        example: "user@example.com",
        description: "User registered email address",
    })
    email!: string;
}
