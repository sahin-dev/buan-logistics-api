import { IsArray, IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HubProviderApplicationDto {
  @ApiProperty({ example: 'My Hub Shop' })
  @IsNotEmpty()
  @IsString()
  shopName: string;

  @ApiProperty({ example: '123 Hub Lane, Dhaka' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'Near Metro Station' })
  @IsNotEmpty()
  @IsString()
  landmark: string;

  @ApiProperty({ example: 'Dhaka' })
  @IsNotEmpty()
  @IsString()
  cityOrState: string;

  @ApiProperty({ example: '+8801711111111' })
  @IsNotEmpty()
  @IsString()
  contact: string;

  @ApiProperty({ example: 'shop@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: true })
  @IsNotEmpty()
  @IsBoolean()
  cctvAvailable: boolean;

  @ApiProperty({ example: 'John Owner' })
  @IsNotEmpty()
  @IsString()
  ownerName: string;

  @ApiProperty({ example: 'owner@example.com' })
  @IsNotEmpty()
  @IsEmail()
  ownerEmail: string;

  @ApiProperty({ example: 'EMAIL' })
  @IsNotEmpty()
  @IsString()
  prefferedContactMethod: string;

  @ApiProperty({ example: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  operatingDays: string[];

  @ApiProperty({ example: '2026-06-14T08:00:00.000Z' })
  @IsNotEmpty()
  email_active_window_from: string;

  @ApiProperty({ example: '2026-06-14T20:00:00.000Z' })
  @IsNotEmpty()
  email_active_window_to: string;

  @ApiProperty({ example: 2 })
  @IsNotEmpty()
  @IsNumber()
  daily_minimum_staff: number;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsNumber()
  daily_maximum_staff: number;

  @ApiProperty({ example: '50-100 visitors' })
  @IsNotEmpty()
  @IsString()
  daily_foot_traffic: string;

  @ApiProperty({ example: false })
  @IsNotEmpty()
  @IsBoolean()
  handledDeliveryServiceBefore: boolean;

  @ApiProperty({ example: true })
  @IsNotEmpty()
  @IsBoolean()
  atLeastSixMonthCommitted: boolean;

  @ApiProperty({ example: 'Hope to partner with you.', required: false })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ example: [], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];
}
