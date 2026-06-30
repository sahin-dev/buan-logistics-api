import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBranchDto {
  @ApiProperty({ example: 'Dhaka Branch' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '123 Main St, Dhaka' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'Dhaka' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 23.8103, description: 'Latitude for map display' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 90.4125, description: 'Longitude for map display' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;
}

