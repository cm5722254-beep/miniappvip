import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_bot?: boolean;
  is_premium?: boolean;
}

export interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      telegramUser?: TelegramUser;
      telegramInitData?: TelegramInitData;
    }
  }
}

@Injectable()
export class TelegramAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TelegramAuthMiddleware.name);
  private readonly MAX_AUTH_AGE_SECONDS = 86400; // 24 hours

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('TelegramWebApp ')) {
      throw new UnauthorizedException('Telegram auth header missing');
    }

    const initDataRaw = authHeader.slice('TelegramWebApp '.length);
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    try {
      const parsed = this.validateAndParse(initDataRaw, botToken);
      req.telegramUser = parsed.user;
      req.telegramInitData = parsed;
      next();
    } catch (err) {
      this.logger.warn(`Telegram auth failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Telegram authentication failed');
    }
  }

  /**
   * Validates Telegram Mini App initData per official Telegram spec.
   * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  private validateAndParse(initDataRaw: string, botToken: string): TelegramInitData {
    const params = new URLSearchParams(initDataRaw);
    const receivedHash = params.get('hash');

    if (!receivedHash) {
      throw new Error('Missing hash in initData');
    }

    // Build data-check-string: all fields sorted alphabetically except hash
    const dataCheckArr: string[] = [];
    const sortedKeys = Array.from(params.keys())
      .filter((k) => k !== 'hash')
      .sort();

    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // HMAC-SHA256 key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // Compute expected hash
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== receivedHash) {
      throw new Error('Hash mismatch — invalid initData');
    }

    // Validate auth_date is not too old
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > this.MAX_AUTH_AGE_SECONDS) {
      throw new Error('initData expired');
    }

    // Parse user
    const userJson = params.get('user');
    if (!userJson) {
      throw new Error('Missing user in initData');
    }

    const user: TelegramUser = JSON.parse(userJson);
    if (!user.id || !user.first_name) {
      throw new Error('Invalid user data in initData');
    }

    return {
      user,
      auth_date: authDate,
      hash: receivedHash,
      query_id: params.get('query_id') || undefined,
      start_param: params.get('start_param') || undefined,
    };
  }
}
