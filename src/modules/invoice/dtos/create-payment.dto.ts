import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentType } from 'generated/prisma/enums';

export class CreatePaymentDto {
  @ApiProperty({ example: 500.0 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'CREDIT_CARD' })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 'tx_123456789', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ example: 'FULL' })
  @IsNotEmpty()
  @IsEnum(PaymentType)
  paymentType: PaymentType;
}
