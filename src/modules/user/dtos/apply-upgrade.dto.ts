import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Tier } from 'generated/prisma/enums';

export class ApplyUpgradeDto {
  @ApiProperty({ example: 'T2' })
  @IsNotEmpty()
  @IsEnum(Tier)
  targetTier: Tier;
}
