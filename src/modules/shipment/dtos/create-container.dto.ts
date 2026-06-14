import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContainerType } from 'generated/prisma/enums';

export class CreateContainerDto {
  @ApiProperty({ example: 'CON-100293' })
  @IsNotEmpty()
  @IsString()
  containerNumber: string;

  @ApiProperty({ example: '20ft', description: 'Container size, e.g., 20ft, 40ft' })
  @IsNotEmpty()
  @IsString()
  size: string;

  @ApiProperty({ example: 'CONSOLIDATED' })
  @IsNotEmpty()
  @IsEnum(ContainerType)
  type: ContainerType;

  @ApiProperty({ example: 'branch-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  branchId: string;
}
