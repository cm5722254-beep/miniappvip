import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelegramAuthDto {
  @ApiProperty({ description: 'Raw Telegram initData string from WebApp.initData' })
  @IsString()
  @IsNotEmpty()
  initData: string;
}

export class AdminLoginDto {
  @ApiProperty({ description: 'Admin username', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Admin password', example: 'securePassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AdminRefreshDto {
  @ApiProperty({ description: 'Current admin JWT refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class TelegramUserData {
  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  language_code?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;
}
