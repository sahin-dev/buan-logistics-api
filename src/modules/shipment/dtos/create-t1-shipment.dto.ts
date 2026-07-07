import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PickupType,
  ShipmentRoute,
  ShipmentServiceOption,
  ShipmentType,
} from 'generated/prisma/enums';

const T1_SHIPMENT_TYPES = [
  ShipmentType.AIR_CARGO,
  ShipmentType.SEA_CARGO,
  ShipmentType.EXPRESS_SHIPMENT,
] as const;

export class CreateT1ShipmentDto {
  @ApiPropertyOptional({
    example: 'NIGERIA_TO_ABROAD',
    enum: ShipmentRoute,
    enumName: 'ShipmentRoute',
    description: 'Shipment route tab selected on the create shipment screen',
  })
  @IsOptional()
  @IsEnum(ShipmentRoute)
  shipmentRoute?: ShipmentRoute;

  @ApiPropertyOptional({
    example: 'AIR_CARGO',
    enum: T1_SHIPMENT_TYPES,
    enumName: 'ShipmentType',
    description: 'Choose your Shipment type: Air cargo, Sea cargo, or Express Shipment',
  })
  @IsOptional()
  @IsEnum(ShipmentType)
  @IsIn(T1_SHIPMENT_TYPES)
  shipmentType?: ShipmentType;

  @ApiPropertyOptional({
    example: 'DROP_OFF',
    enum: ShipmentServiceOption,
    enumName: 'ShipmentServiceOption',
    description: 'Choose Your Service: Warehouse or Drop off',
  })
  @IsOptional()
  @IsEnum(ShipmentServiceOption)
  shipmentService?: ShipmentServiceOption;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Sender full name as shown on the create shipment form' })
  @IsOptional()
  @IsString()
  senderFullName?: string;

  @ApiProperty({ example: '+8801700000000' })
  @IsNotEmpty()
  @IsString()
  senderPhone: string;

  @ApiPropertyOptional({ example: 'John', description: 'Legacy first-name field. Optional when senderFullName is provided.' })
  @IsOptional()
  @IsString()
  senderFirstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Legacy last-name field. Optional when senderFullName is provided.' })
  @IsOptional()
  @IsString()
  senderLastName?: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsNotEmpty()
  @IsEmail()
  senderEmail: string;

  @ApiPropertyOptional({ example: '123 Sender St, Lagos' })
  @IsOptional()
  @IsString()
  senderAddress?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  senderCountry?: string;

  @ApiProperty({ example: 'Jane Smith' })
  @IsNotEmpty()
  @IsString()
  receiverName: string;

  @ApiProperty({ example: '+8801800000000' })
  @IsNotEmpty()
  @IsString()
  receiverPhone: string;

  @ApiPropertyOptional({ example: 'jane.smith@example.com' })
  @IsOptional()
  @IsEmail()
  receiverEmail?: string;

  @ApiPropertyOptional({ example: 'Ghana' })
  @IsOptional()
  @IsString()
  receiverCountry?: string;

  @ApiPropertyOptional({ example: '456 Elm St, Chittagong', description: 'Legacy receiver address field. Optional when receiverAddressLine1 is provided.' })
  @IsOptional()
  @IsString()
  receiverAddress?: string;

  @ApiPropertyOptional({ example: '456 Elm St', description: 'Alias for receiverAddress when the UI sends Address line 1' })
  @IsOptional()
  @IsString()
  receiverAddressLine1?: string;

  @ApiPropertyOptional({ example: '00233' })
  @IsOptional()
  @IsString()
  receiverPostalCode?: string;

  @ApiProperty({ example: 2.5 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  weight: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return ['true', 'yes', '1'].includes(value.toLowerCase());
    return Boolean(value);
  })
  @IsBoolean()
  insurance?: boolean;

  @ApiPropertyOptional({ example: 'Electronics worth NGN 150,000' })
  @IsOptional()
  @IsString()
  valueOfGoods?: string;

  @ApiProperty({ example: 'hub-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  hubId: string;

  @ApiPropertyOptional({
    example: 'DOORSTEP_DELIVERY',
    enum: PickupType,
    enumName: 'PickupType',
    description: 'Choose your pickup type: Doorstep delivery or Warehouse pickup',
  })
  @IsOptional()
  @IsEnum(PickupType)
  pickupType?: PickupType;

  @ApiPropertyOptional({ example: '/uploads/parcel-photo.jpg', description: 'Uploaded parcel photo URL or relative path' })
  @IsOptional()
  @IsString()
  packageImageUrl?: string;

  @ApiPropertyOptional({ example: 'DOOR_TO_DOOR' })
  @IsOptional()
  @IsString()
  paymentServiceType?: string;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  paymentCurrencyType?: string;

  @ApiPropertyOptional({ example: 25000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountPayable?: number;

  @ApiPropertyOptional({ example: 'Ahmed Karim', description: 'Contact person name for pickup (if sending on behalf of someone)' })
  @IsOptional()
  @IsString()
  pickupContactName?: string;

  @ApiPropertyOptional({ example: '+8801600000000', description: 'Contact phone for pickup' })
  @IsOptional()
  @IsString()
  pickupContactPhone?: string;

  @ApiPropertyOptional({ example: '123 Main St, Dhaka', description: 'Pickup address if different from sender' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiPropertyOptional({ example: '2026-07-01T10:00:00Z', description: 'Preferred pickup date and time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledPickupDate?: string;
}
