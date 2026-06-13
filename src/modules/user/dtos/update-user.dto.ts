import { IsNotEmpty, IsString, IsEmail, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateUserDto {
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

    @IsEmail()
    @IsOptional()
    @ApiProperty({
        example: "user@example.com",
        description: "User email address",
        required: false,
    })
    email?: string;
}
