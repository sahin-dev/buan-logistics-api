import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsObject, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentType } from 'generated/prisma/enums';

export class CreateT2T3ShipmentDto {
  @ApiProperty({ example: 'sender-user-uuid' })
  @IsNotEmpty()
  @IsUUID()
  senderId: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsNotEmpty()
  @IsString()
  receiverName: string;

  @ApiProperty({ example: '+8801900000000' })
  @IsNotEmpty()
  @IsString()
  receiverPhone: string;

  @ApiProperty({ example: '789 Pine St, Sylhet' })
  @IsNotEmpty()
  @IsString()
  receiverAddress: string;

  @ApiProperty({ example: 12.5 })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiProperty({ example: 'Fragile electronic components', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1500.0 })
  @IsNotEmpty()
  @IsNumber()
  cost: number;

  @ApiProperty({ example: { width: 50, height: 40, depth: 30 } })
  @IsOptional()
  @IsObject()
  packageDetails?: any;

  @ApiProperty({ example: { containerId: 'CON-999', size: '20ft' } })
  @IsOptional()
  @IsObject()
  containerDetails?: any;

  @ApiProperty({ example: 'branch-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ example: 'STANDARD' })
  @IsNotEmpty()
  @IsEnum(ShipmentType)
  type: ShipmentType;

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
