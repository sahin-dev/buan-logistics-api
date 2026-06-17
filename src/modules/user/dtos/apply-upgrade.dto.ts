import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Tier, OperationMode } from 'generated/prisma/enums';

export class ApplyUpgradeDto {
  @ApiProperty({ example: 'T2' })
  @IsNotEmpty()
  @IsEnum(Tier)
  targetTier: Tier;

  // Tier 2 (Business Customer) Fields
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  autorizedPersonFullName?: string;

  @ApiProperty({ example: 'Manager', required: false })
  @IsOptional()
  @IsString()
  authorizedPersonTitle?: string;

  @ApiProperty({ example: 'Acme Corp', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: 'Acme Logistics', required: false })
  @IsOptional()
  @IsString()
  tradingName?: string;

  @ApiProperty({ example: 'REG-12345678', required: false })
  @IsOptional()
  @IsString()
  Reg_no?: string;

  @ApiProperty({ example: 'Philippines', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: '123 Main St, Manila', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'contact@acme.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+63 912 345 6789', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'https://acme.com', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: 'Retail', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: 'Online', enum: OperationMode, required: false })
  @IsOptional()
  @IsEnum(OperationMode)
  operation_mode?: OperationMode;

  // Tier 3 (Business Partner) Fields
  @ApiProperty({ example: '1-3 years', required: false })
  @IsOptional()
  @IsString()
  yearsInOperation?: string;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ example: 'Operations Lead', required: false })
  @IsOptional()
  @IsString()
  contactPosition?: string;

  @ApiProperty({ example: '+63 987 654 3210', required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: 'jane.doe@acme.com', required: false })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ example: ['Freight Forwarding', 'Courier Services'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  businessNature?: string[];

  @ApiProperty({ example: 'Singapore, Malaysia', required: false })
  @IsOptional()
  @IsString()
  countriesOperateFrom?: string;

  @ApiProperty({ example: 'USA, UK, Australia', required: false })
  @IsOptional()
  @IsString()
  countriesShipTo?: string;

  @ApiProperty({ example: ['General Cargo', 'Electronics'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cargoTypes?: string[];

  @ApiProperty({ example: '500kg - 2 tons', required: false })
  @IsOptional()
  @IsString()
  estimatedMonthlyVolume?: string;

  @ApiProperty({ example: 'Express delivery services requested.', required: false })
  @IsOptional()
  @IsString()
  servicesRequired?: string;
}
