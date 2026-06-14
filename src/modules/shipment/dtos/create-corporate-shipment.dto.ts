import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsObject, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentType } from 'generated/prisma/enums';

export class CreateCorporateShipmentDto {
  @ApiProperty({ example: 'corporate-partner-user-uuid' })
  @IsNotEmpty()
  @IsUUID()
  senderId: string;

  @ApiProperty({ example: 'Jane Receiver' })
  @IsNotEmpty()
  @IsString()
  receiverName: string;

  @ApiProperty({ example: '+8801912345678' })
  @IsNotEmpty()
  @IsString()
  receiverPhone: string;

  @ApiProperty({ example: '123 Receiver Rd, City' })
  @IsNotEmpty()
  @IsString()
  receiverAddress: string;

  @ApiProperty({ example: 15.5 })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiProperty({ example: 'Bulk documents for office', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: { packagesCount: 10 } })
  @IsOptional()
  @IsObject()
  packageDetails?: any;

  @ApiProperty({ example: 'branch-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ example: 'STANDARD' })
  @IsNotEmpty()
  @IsEnum(ShipmentType)
  type: ShipmentType;
}
