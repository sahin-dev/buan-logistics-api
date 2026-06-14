import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHubDto {
  @ApiProperty({ example: 'Mirpur Hub' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Block D, Mirpur, Dhaka' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'branch-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ example: 'user-uuid-here', required: false })
  @IsOptional()
  @IsUUID()
  hubProviderId?: string;

  @ApiProperty({ example: 5.0, required: false, description: 'Commission amount per package delivered through this hub' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPerPackage?: number;
}
