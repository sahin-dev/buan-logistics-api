import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: 'john', required: false, description: 'Optional search keyword' })
  @IsOptional()
  search?: string;

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
