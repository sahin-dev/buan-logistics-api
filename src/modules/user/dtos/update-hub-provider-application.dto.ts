import { PartialType, ApiProperty } from '@nestjs/swagger';
import { HubProviderApplicationDto } from './hub-provider-application.dto';
import { ApplicationStatus } from 'generated/prisma/enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateHubProviderApplicationDto extends PartialType(HubProviderApplicationDto) {
    @ApiProperty({ enum: ApplicationStatus, required: false })
    @IsOptional()
    @IsEnum(ApplicationStatus)
    status?: ApplicationStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    rejection_notes?: string;
}
