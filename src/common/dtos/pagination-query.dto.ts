import { IsOptional, IsInt, Min, Max, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiProperty({ example: 1, required: false, description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({ example: 10, required: false, description: 'Number of items per page (max 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ example: 'john', description: 'Optional search keyword across common text fields' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'PENDING', description: 'Filter by status where supported' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'ADMIN', description: 'Filter by role where supported' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'AIR_CARGO', description: 'Filter by reward type where supported' })
  @IsOptional()
  @IsString()
  rewardType?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Filter by active/inactive state where supported' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return value;
  })
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Filter records created on or after this date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Filter records created on or before this date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'AIR_CARGO', description: 'Filter by shipment mode/type where supported' })
  @IsOptional()
  @IsString()
  shipmentType?: string;

  @ApiPropertyOptional({ example: 'Pending', description: 'Filter by application status where supported' })
  @IsOptional()
  @IsString()
  applicationStatus?: string;

  constructor(partial?: Partial<PaginationQueryDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
    if (this.page < 1) this.page = 1;
    if (this.limit < 1) this.limit = 10;
    if (this.limit > 100) this.limit = 100;
  }

  getSkip(): number {
    return (this.page - 1) * this.limit;
  }
}
