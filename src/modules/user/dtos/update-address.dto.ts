import { IsBoolean, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateAddressDto {
    @ApiProperty({ example: "Office", required: false, description: "Title of the address" })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ example: "456 Office Rd, Springfield", required: false, description: "Detailed address text" })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: true, required: false, description: "Set as the default address" })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
