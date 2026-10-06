import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

// ─── Telegram API Types ───────────────────────────────────────────────────────

export interface TgInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface TgInlineKeyboard {
  inline_keyboard: TgInlineKeyboardButton[][];
}

export interface TgSendMessageParams {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: TgInlineKeyboard;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  date: number;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TgChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface TgBotCommand {
  command: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly botToken: string;
  private readonly apiBase: string;
  readonly miniAppUrl: string;

  constructor(private readonly config: ConfigService) {
    this.botToken = config.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.miniAppUrl = config.get<string>(
      'TELEGRAM_MINI_APP_URL',
      'https://t.me/ruengvipkhmer_bot/app',
    );
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;

    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not set — bot features disabled');
    }
  }

  // ─── Core HTTP helper ────────────────────────────────────────────────────

  private callApi<T = unknown>(
    method: string,
    payload: object = {},
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.botToken) {
        resolve({} as T);
        return;
      }

      const body = JSON.stringify(payload);

      const req = https.request(
        {
          hostname: 'api.telegram.org',
          path: `/bot${this.botToken}/${method}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (!parsed.ok) {
                this.logger.warn(
                  `Telegram API ${method} error: ${parsed.description}`,
                );
                resolve(parsed as T); // Resolve — caller decides whether to throw
              } else {
                resolve(parsed.result as T);
              }
            } catch {
              reject(new Error(`Invalid JSON from Telegram API`));
            }
          });
        },
      );

      req.on('error', (err) => {
        this.logger.error(`Telegram API ${method} request failed: ${err.message}`);
        resolve({} as T); // Never reject — bot errors are non-fatal
      });

      req.write(body);
      req.end();
    });
  }

  // ─── Bot API Methods ──────────────────────────────────────────────────────

  /**
   * Send a text message (optionally with inline keyboard)
   */
  async sendMessage(params: TgSendMessageParams): Promise<void> {
    await this.callApi('sendMessage', params);
  }

  /**
   * Send a message with the Mini App "Open App" button
   */
  async sendMiniAppMessage(
    chatId: string | number,
    text: string,
    buttonLabel = '🎬 បើក Mini App',
  ): Promise<void> {
    await this.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: buttonLabel,
              web_app: { url: this.miniAppUrl },
            },
          ],
        ],
      },
    });
  }

  /**
   * Answer a callback query (required to dismiss loading state)
   */
  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false,
  ): Promise<void> {
    await this.callApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    });
  }

  /**
   * Register webhook URL with Telegram
   */
  async setWebhook(webhookUrl: string, secretToken: string): Promise<boolean> {
    const result = await this.callApi<{ ok?: boolean; description?: string }>(
      'setWebhook',
      {
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      },
    );
    this.logger.log(
      `setWebhook → ${(result as { ok?: boolean }).ok ? 'OK' : 'FAILED'}`,
    );
    return !!(result as { ok?: boolean }).ok;
  }

  /**
   * Delete webhook (fall back to polling mode)
   */
  async deleteWebhook(): Promise<void> {
    await this.callApi('deleteWebhook', { drop_pending_updates: false });
  }

  /**
   * Register bot commands in the Telegram menu
   */
  async setMyCommands(commands: TgBotCommand[]): Promise<void> {
    await this.callApi('setMyCommands', { commands });
    this.logger.log(`setMyCommands: ${commands.map((c) => '/' + c.command).join(', ')}`);
  }

  /**
   * Set bot description (shown on bot profile page)
   */
  async setMyDescription(description: string): Promise<void> {
    await this.callApi('setMyDescription', { description });
  }

  /**
   * Set short bot description (shown when user opens a chat)
   */
  async setMyShortDescription(shortDescription: string): Promise<void> {
    await this.callApi('setMyShortDescription', { short_description: shortDescription });
  }

  /**
   * Get webhook info (useful for debugging)
   */
  async getWebhookInfo(): Promise<object> {
    return this.callApi('getWebhookInfo');
  }

  /**
   * Get bot info
   */
  async getMe(): Promise<object> {
    return this.callApi('getMe');
  }

  // ─── Notification Helpers ─────────────────────────────────────────────────

  /**
   * Notify user: deposit approved with balance update
   */
  async notifyDepositApproved(
    chatId: string,
    amount: string,
    newBalance: string,
  ): Promise<void> {
    await this.sendMiniAppMessage(
      chatId,
      `👑 <b>អាធិរាជរឿង</b>\n\n` +
        `✅ <b>ការដាក់ប្រាក់បានជោគជ័យ!</b>\n` +
        `💰 ចំនួន: <b>$${amount}</b>\n` +
        `📊 សមតុល្យថ្មី: <b>$${newBalance}</b>\n\n` +
        `ឥឡូវអ្នកអាចទិញ និងមើលរឿងបានហើយ! 🎬`,
      '🎬 ទៅទិញរឿង',
    );
  }

  /**
   * Notify user: deposit rejected
   */
  async notifyDepositRejected(
    chatId: string,
    amount: string,
    reason: string,
  ): Promise<void> {
    await this.sendMiniAppMessage(
      chatId,
      `👑 <b>អាធិរាជរឿង</b>\n\n` +
        `❌ <b>ការដាក់ប្រាក់មិនបានអនុម័ត</b>\n` +
        `💰 ចំនួន: $${amount}\n` +
        `📋 ហេតុផល: ${reason || 'មិនបានបញ្ជាក់'}\n\n` +
        `សូមទាក់ទង Admin ប្រសិនបើមានបញ្ហា`,
      '📞 ទំនាក់ទំនង',
    );
  }

  /**
   * Notify user: movie purchase confirmed
   */
  async notifyPurchaseSuccess(
    chatId: string,
    movieTitle: string,
    movieId: string,
  ): Promise<void> {
    await this.sendMessage({
      chat_id: chatId,
      text:
        `👑 <b>អាធិរាជរឿង</b>\n\n` +
        `🎬 <b>ការទិញបានជោគជ័យ!</b>\n` +
        `រឿង: <b>${movieTitle}</b>\n\n` +
        `▶️ ចុចដើម្បីចាប់ផ្តើមមើល`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '▶️ មើលឥឡូវនេះ',
              web_app: { url: `${this.miniAppUrl}?startapp=movie_${movieId}` },
            },
          ],
        ],
      },
    });
  }

  /**
   * Notify users: new episode available
   */
  async notifyNewEpisode(
    chatId: string,
    movieTitle: string,
    episodeNum: number,
    episodeTitle: string,
    movieId: string,
  ): Promise<void> {
    await this.sendMessage({
      chat_id: chatId,
      text:
        `👑 <b>អាធិរាជរឿង</b>\n\n` +
        `🆕 <b>ភាគថ្មីបានបន្ថែម!</b>\n` +
        `📺 ${movieTitle}\n` +
        `▶️ ភាគ ${episodeNum}: ${episodeTitle}`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `▶️ មើលភាគ ${episodeNum}`,
              web_app: { url: `${this.miniAppUrl}?startapp=movie_${movieId}` },
            },
          ],
        ],
      },
    });
  }
}
