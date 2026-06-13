import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

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
