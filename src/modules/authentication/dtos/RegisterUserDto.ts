import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsStrongPassword } from "class-validator"

export class RegisterUserDto {

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "John"
    })
    firstName: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "Doe"
    })
    lastName: string

    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({
        example: "johndoe@yopmail.com"
    })
    email: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "password1234!"
    })
    password: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "password1234!"
    })
    confirmPassword: string

    @IsString()
    @IsOptional()
    @ApiProperty({
        example: "REF-123456",
        required: false
    })
    referralCode?: string
}