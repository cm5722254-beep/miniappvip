import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService, TgUpdate } from './telegram-bot.service';
import { UsersService } from '../users/users.service';

@Controller('telegram')
export class TelegramBotController {
  private readonly logger = new Logger(TelegramBotController.name);
  private readonly webhookSecret: string;
  private readonly miniAppUrl: string;

  constructor(
    private readonly botService: TelegramBotService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {
    this.webhookSecret = config.get<string>('TELEGRAM_WEBHOOK_SECRET', '');
    this.miniAppUrl = config.get<string>(
      'TELEGRAM_MINI_APP_URL',
      'https://t.me/ruengvipkhmer_bot/app',
    );
  }

  /**
   * POST /api/v1/telegram/webhook
   *
   * Telegram sends all updates here.
   * Validated via X-Telegram-Bot-Api-Secret-Token header.
   * Must always return 200 — Telegram will retry on non-200.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() update: TgUpdate,
    @Headers('x-telegram-bot-api-secret-token') secretHeader: string,
  ): Promise<{ ok: boolean }> {
    // ── Secret token validation ──
    if (this.webhookSecret && secretHeader !== this.webhookSecret) {
      this.logger.warn(
        `Webhook: rejected request — invalid secret token`,
      );
      throw new UnauthorizedException('Invalid webhook secret');
    }

    try {
      // ── Route to handler ──
      if (update.message) {
        await this.handleMessage(update);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update);
      }
    } catch (err) {
      // Never let errors bubble up — Telegram would keep retrying
      this.logger.error(`Webhook handler error: ${(err as Error).message}`);
    }

    return { ok: true };
  }

  // ─── Message handler ──────────────────────────────────────────────────────

  private async handleMessage(update: TgUpdate): Promise<void> {
    const message = update.message!;
    const text = message.text?.trim() ?? '';
    const chatId = message.chat.id;
    const from = message.from;

    if (!from || from.is_bot) return;

    this.logger.log(
      `Message from ${from.username ?? from.id}: "${text}"`,
    );

    // ─── /start command ───
    if (text.startsWith('/start')) {
      await this.handleStart(chatId, from);
      return;
    }

    // ─── /help command ───
    if (text === '/help') {
      await this.handleHelp(chatId);
      return;
    }

    // ─── /balance command ───
    if (text === '/balance') {
      await this.handleBalance(chatId, from.id);
      return;
    }

    // ─── /movies command ───
    if (text === '/movies') {
      await this.handleMovies(chatId);
      return;
    }

    // ─── Unknown message — prompt them to open the app ───
    await this.botService.sendMiniAppMessage(
      chatId,
      `👑 <b>អាធិរាជរឿង</b>\n\nចុចប៊ូតុងខាងក្រោមដើម្បីបើក Mini App 🎬`,
      '🎬 បើក Mini App',
    );
  }

  // ─── Callback query handler ───────────────────────────────────────────────

  private async handleCallbackQuery(update: TgUpdate): Promise<void> {
    const cq = update.callback_query!;
    const data = cq.data ?? '';

    // Always acknowledge the callback
    await this.botService.answerCallbackQuery(cq.id);

    this.logger.log(
      `CallbackQuery from ${cq.from.username ?? cq.from.id}: "${data}"`,
    );
  }

  // ─── Command implementations ─────────────────────────────────────────────

  private async handleStart(chatId: number, from: TgUpdate['message']['from']): Promise<void> {
    const firstName = from?.first_name ?? 'បងប្អូន';

    await this.botService.sendMessage({
      chat_id: chatId,
      text:
        `👑 <b>ស្វាគមន៍មក អាធិរាជរឿង!</b>\n\n` +
        `សួស្តី <b>${firstName}</b>! 🙏\n\n` +
        `🎬 <b>យើងមាន:</b>\n` +
        `• រឿងកម្ពុជា ថៃ ចិន និងអន្តរជាតិ\n` +
        `• ភាពយន្ត + ស៊េរីអង់គ្លេស-ខ្មែរ\n` +
        `• ម្ចាស់ VIP បានឆ្ពោះ 50% OFF!\n\n` +
        `💰 <b>តម្លៃពិសេស</b> — ចាប់ពី $1 ប៉ុណ្ណោះ\n\n` +
        `ចុចប៊ូតុងខាងក្រោមដើម្បីចូលមើលរឿង 👇`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎬 ចូលមើលរឿង',
              web_app: { url: this.miniAppUrl },
            },
          ],
          [
            {
              text: '💰 ដាក់ប្រាក់',
              web_app: { url: `${this.miniAppUrl}?startapp=deposit` },
            },
            {
              text: '📚 រឿងខ្ញុំ',
              web_app: { url: `${this.miniAppUrl}?startapp=library` },
            },
          ],
        ],
      },
    });
  }

  private async handleHelp(chatId: number): Promise<void> {
    await this.botService.sendMiniAppMessage(
      chatId,
      `👑 <b>អាធិរាជរឿង — ជំនួយ</b>\n\n` +
        `📋 <b>ពាក្យបញ្ជា:</b>\n` +
        `/start — ចាប់ផ្តើមប្រើប្រាស់\n` +
        `/movies — ចូលមើលរឿង\n` +
        `/balance — ពិនិត្យសមតុល្យ\n` +
        `/help — បង្ហាញជំនួយ\n\n` +
        `🔧 <b>ជំនួយ:</b> @ruengvipkhmer_bot`,
      '🎬 បើក App',
    );
  }

  private async handleBalance(chatId: number, telegramId: number): Promise<void> {
    try {
      const user = await this.usersService.findByTelegramId(String(telegramId));
      if (!user) {
        await this.botService.sendMiniAppMessage(
          chatId,
          `⚠️ គណនីមិនទាន់ចុះឈ្មោះ\nសូមបើក Mini App ដើម្បីចុះឈ្មោះ`,
          '🎬 ចុះឈ្មោះ',
        );
        return;
      }

      await this.botService.sendMiniAppMessage(
        chatId,
        `👑 <b>អាធិរាជរឿង</b>\n\n` +
          `💰 <b>សមតុល្យ:</b> $${parseFloat(String(user.wallet?.balance ?? 0)).toFixed(2)}\n\n` +
          `ចុចដើម្បីដាក់ប្រាក់បន្ថែម 👇`,
        '➕ ដាក់ប្រាក់',
      );
    } catch {
      await this.botService.sendMiniAppMessage(
        chatId,
        `⚠️ មិនអាចទាញព័ត៌មានបាន\nសូម try ម្តងទៀត`,
        '🎬 បើក App',
      );
    }
  }

  private async handleMovies(chatId: number): Promise<void> {
    await this.botService.sendMiniAppMessage(
      chatId,
      `👑 <b>អាធិរាជរឿង</b>\n\n` +
        `🎬 ចុចខាងក្រោមដើម្បីរុករករឿងទាំងអស់`,
      '🔍 រុករករឿង',
    );
  }
}
