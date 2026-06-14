import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCorporateApplicationDto {
  @ApiProperty({ example: 'Logistics Co. Ltd.' })
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'Logistics Express', required: false })
  @IsOptional()
  @IsString()
  tradingName?: string;

  @ApiProperty({ example: 'REG-123456' })
  @IsNotEmpty()
  @IsString()
  regNo: string;

  @ApiProperty({ example: 'Singapore' })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ example: '456 Business Rd, Singapore' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: '1-3 years', description: 'Years in operation: Less than 1 year, 1-3 years, 3-5 years, Over 5 years' })
  @IsNotEmpty()
  @IsString()
  yearsInOperation: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsNotEmpty()
  @IsString()
  contactName: string;

  @ApiProperty({ example: 'Operations Manager' })
  @IsNotEmpty()
  @IsString()
  contactPosition: string;

  @ApiProperty({ example: '+65 9123 4567' })
  @IsNotEmpty()
  @IsString()
  contactPhone: string;

  @ApiProperty({ example: 'jane.doe@logisticsco.com' })
  @IsNotEmpty()
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: 'https://logisticsco.com', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: ['Freight Forwarding', 'Courier Services'] })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  businessNature: string[];

  @ApiProperty({ example: 'Singapore, Malaysia' })
  @IsNotEmpty()
  @IsString()
  countriesOperateFrom: string;

  @ApiProperty({ example: 'USA, UK, Australia' })
  @IsNotEmpty()
  @IsString()
  countriesShipTo: string;

  @ApiProperty({ example: ['General Cargo', 'Electronics'] })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  cargoTypes: string[];

  @ApiProperty({ example: '2 - 10 tons' })
  @IsNotEmpty()
  @IsString()
  estimatedMonthlyVolume: string;

  @ApiProperty({ example: 'Bulk package consolidation and air freight services.' })
  @IsNotEmpty()
  @IsString()
  servicesRequired: string;
}
