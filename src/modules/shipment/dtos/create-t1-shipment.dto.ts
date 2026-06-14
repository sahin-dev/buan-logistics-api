import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateT1ShipmentDto {
  @ApiProperty({ example: '+8801700000000' })
  @IsNotEmpty()
  @IsString()
  senderPhone: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  senderFirstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  senderLastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsNotEmpty()
  @IsString()
  senderEmail: string;

  @ApiProperty({ example: 'Jane Smith' })
  @IsNotEmpty()
  @IsString()
  receiverName: string;

  @ApiProperty({ example: '+8801800000000' })
  @IsNotEmpty()
  @IsString()
  receiverPhone: string;

  @ApiProperty({ example: '456 Elm St, Chittagong' })
  @IsNotEmpty()
  @IsString()
  receiverAddress: string;

  @ApiProperty({ example: 2.5 })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiProperty({ example: 'hub-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  hubId: string;

  // ─── "Send for Someone Else" / Pickup Scheduling ─────────────────────────

  @ApiProperty({ example: 'Ahmed Karim', required: false, description: 'Contact person name for pickup (if sending on behalf of someone)' })
  @IsOptional()
  @IsString()
  pickupContactName?: string;

  @ApiProperty({ example: '+8801600000000', required: false, description: 'Contact phone for pickup' })
  @IsOptional()
  @IsString()
  pickupContactPhone?: string;

  @ApiProperty({ example: '123 Main St, Dhaka', required: false, description: 'Pickup address if different from sender' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiProperty({ example: '2026-07-01T10:00:00Z', required: false, description: 'Preferred pickup date and time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledPickupDate?: string;
}
