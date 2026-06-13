import { IsNotEmpty, IsString, IsEmail, IsOptional, IsStrongPassword } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "John",
        description: "User first name",
    })
    firstName: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "Doe",
        description: "User last name",
    })
    lastName: string;

    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({
        example: "user@example.com",
        description: "User email address",
    })
    email: string;

    @IsString()
    @IsNotEmpty()
    @IsStrongPassword()
    @ApiProperty({
        example: "Password123!",
        description: "User password",
    })
    password: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "local",
        description: "Authentication provider",
        required: false,
    })
    provider?: string;
}