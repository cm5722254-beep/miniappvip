import { Controller, Post, Req, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Telegram Mini App login
   * Requires TelegramWebApp header with verified initData
   * The middleware validates the initData before this handler is called
   */
  @Post('telegram')
  @ApiOperation({ summary: 'Authenticate via Telegram Mini App' })
  async telegramAuth(@Req() req: Request) {
    // telegramUser is attached by TelegramAuthMiddleware — already verified
    if (!req.telegramUser) {
      throw new Error('Telegram user not found on request');
    }
    return this.authService.authenticateTelegram(req.telegramUser);
  }

  /**
   * Admin login — completely separate from user Telegram auth
   */
  @Post('admin/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Admin login with username and password' })
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.username, dto.password);
  }

  /**
   * Verify current JWT is still valid
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: { id: string; telegramId: string; firstName: string }) {
    return user;
  }
}
