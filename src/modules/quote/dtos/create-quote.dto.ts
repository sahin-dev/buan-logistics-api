import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateQuoteDto {
    // ─── Sender Information ──────────────────────────────────────────────────
    @ApiProperty({ example: "Air Cargo", description: "Shipment type (e.g., Air Cargo / Sea cargo)" })
    @IsNotEmpty()
    @IsString()
    shipmentType!: string;

    @ApiProperty({ example: "United States", description: "Sender Country" })
    @IsNotEmpty()
    @IsString()
    country!: string;

    @ApiProperty({ example: "Yes", description: "Pickup Services required" })
    @IsNotEmpty()
    @IsString()
    pickupServices!: string;

    @ApiProperty({ example: "John Doe", description: "Sender Full Name" })
    @IsNotEmpty()
    @IsString()
    fullName!: string;

    @ApiProperty({ example: "+1234567890", description: "Sender Phone Number" })
    @IsNotEmpty()
    @IsString()
    phone!: string;

    @ApiProperty({ example: "123 Sender St, NY", description: "Sender Address" })
    @IsNotEmpty()
    @IsString()
    address!: string;

    @ApiProperty({ example: "Box of books", description: "What we are picking up description" })
    @IsNotEmpty()
    @IsString()
    whatWeArePickingUp!: string;

    @ApiProperty({ example: "sender@example.com", description: "Sender Email Address" })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ example: "Express", description: "Shipping Type (e.g. Express / Standard)" })
    @IsNotEmpty()
    @IsString()
    shippingType!: string;

    // ─── Package Information ─────────────────────────────────────────────────
    @ApiProperty({ example: "15kg / 0.5cbm", description: "Weight / Volume information" })
    @IsNotEmpty()
    @IsString()
    weightOrVolume!: string;

    @ApiProperty({ type: "string", format: "binary", required: false, description: "Upload Image file" })
    @IsOptional()
    @IsString()
    uploadImage?: string;

    // ─── Receiver Information ───────────────────────────────────────────────
    @ApiProperty({ example: "United Kingdom", description: "Receiver Country" })
    @IsNotEmpty()
    @IsString()
    receiverCountry!: string;

    @ApiProperty({ example: "Jane Smith", description: "Receiver Full Name" })
    @IsNotEmpty()
    @IsString()
    receiverFullName!: string;

    @ApiProperty({ example: "+44789012345", description: "Receiver Phone Number" })
    @IsNotEmpty()
    @IsString()
    receiverPhone!: string;

    @ApiProperty({ example: "receiver@example.com", description: "Receiver Email Address" })
    @IsEmail()
    @IsNotEmpty()
    receiverEmail!: string;

    @ApiProperty({ example: "456 Receiver Rd, London", description: "Receiver Address" })
    @IsNotEmpty()
    @IsString()
    receiverAddress!: string;
}
