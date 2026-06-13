import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword } from "class-validator"

export class RegisterUserDto {

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
       example:"John"
    })
    firstName:string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example:"Doe"
    })
    lastName:string
    
    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({
        example:"johndoe@yopmail.com"
    })
    email:string

    @IsString()
    @IsNotEmpty()
    @IsStrongPassword()
    @ApiProperty({
        example:"password1234!"
    })
    password:string

    @IsString()
    @IsNotEmpty()
    @IsStrongPassword()
    @ApiProperty({
        example:"password1234"
    })
    confirmPassword:string
}