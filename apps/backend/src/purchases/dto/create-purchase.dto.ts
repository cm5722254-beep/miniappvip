import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyCouponDto {
  @ApiPropertyOptional({ example: 'PROMO10' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
