import { IsNotEmpty, IsNumber, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateCorporateInvoiceDto {
  @ApiProperty({ example: 'corporate-partner-user-uuid' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 2026 })
  @IsNotEmpty()
  @IsNumber()
  @Min(2020)
  year: number;

  @ApiProperty({ example: 6, description: 'Month (1-12)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 500.0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;
}
