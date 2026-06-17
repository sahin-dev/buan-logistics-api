import { PartialType, ApiProperty } from '@nestjs/swagger';
import { ApplyUpgradeDto } from './apply-upgrade.dto';
import { ApplicationStatus } from 'generated/prisma/enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUpgradeApplicationDto extends PartialType(ApplyUpgradeDto) {
    @ApiProperty({ enum: ApplicationStatus, required: false })
    @IsOptional()
    @IsEnum(ApplicationStatus)
    status?: ApplicationStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}
