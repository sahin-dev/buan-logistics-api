import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReplyQuoteDto {
    @ApiProperty({ example: "Your quote is approved. The total estimate is $250.", description: "Message to send to user's email" })
    @IsNotEmpty()
    @IsString()
    message!: string;
}
