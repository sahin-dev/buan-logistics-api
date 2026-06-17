import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateCorporateApplicationDto } from './create-corporate-application.dto';
import { ApplicationStatus } from 'generated/prisma/enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateCorporatePartnerApplicationDto extends PartialType(CreateCorporateApplicationDto) {
    @ApiProperty({ enum: ApplicationStatus, required: false })
    @IsOptional()
    @IsEnum(ApplicationStatus)
    status?: ApplicationStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    rejectionNotes?: string;
}
