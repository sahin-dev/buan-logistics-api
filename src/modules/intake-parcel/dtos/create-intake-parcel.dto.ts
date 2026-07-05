import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIntakeParcelDto {
  @ApiProperty({ example: 'Karim Ahmed' })
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @ApiProperty({ example: '+8801700000000' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'House 12, Road 4, Dhaka' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 'Small electronics parcel' })
  @IsOptional()
  @IsString()
  package_info?: string;
}
