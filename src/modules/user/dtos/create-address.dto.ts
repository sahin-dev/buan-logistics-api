import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAddressDto {
    @ApiProperty({ example: "Home", description: "Title of the address" })
    @IsNotEmpty()
    @IsString()
    title!: string;

    @ApiProperty({ example: "123 Main St, Springfield", description: "Detailed address text" })
    @IsNotEmpty()
    @IsString()
    address!: string;

    @ApiProperty({ example: false, required: false, description: "Set as the default address" })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
