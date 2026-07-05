import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator"
import { Role } from "generated/prisma/enums"

export class SignInUserDto {

    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({
        example: "customer@buanenterprise.com"
    })
    email: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: "user1234"
    })
    password: string

    // @IsString()
    // @IsNotEmpty()
    // @IsEnum(Role)
    // @ApiProperty({
    //     example:Role.USER
    // })
    // role:Role
}