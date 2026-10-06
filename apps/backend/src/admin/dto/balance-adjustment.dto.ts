import { IsNumber, IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum BalanceAdjustmentType {
  CREDIT = 'ADMIN_CREDIT',
  DEBIT = 'ADMIN_DEBIT',
}

export class BalanceAdjustmentDto {
  @ApiProperty({ enum: BalanceAdjustmentType })
  @IsEnum(BalanceAdjustmentType)
  type: BalanceAdjustmentType;

  @ApiProperty({ example: 10.00 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @ApiProperty({ example: 'Compensation for service issue' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
