import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
