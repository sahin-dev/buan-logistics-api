import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ShipmentType } from 'generated/prisma/enums';

export class CreateShipmentFromIntakeDto {
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

  @ApiProperty({ example: 2.5 })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiPropertyOptional({ example: 120.5 })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ example: 'AIR_CARGO', enum: ShipmentType })
  @IsOptional()
  @IsEnum(ShipmentType)
  shipmentType?: ShipmentType;

  @ApiPropertyOptional({ example: { width: 50, height: 40, depth: 30 } })
  @IsOptional()
  @IsObject()
  packageDetails?: any;

  @ApiPropertyOptional({
    example: 'delivery-hub-uuid',
    description: 'Optional. Branch can assign or change this later.',
  })
  @IsOptional()
  @IsUUID()
  deliveryHubId?: string;
}
