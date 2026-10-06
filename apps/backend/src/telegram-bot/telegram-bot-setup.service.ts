import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from './telegram-bot.service';

/**
 * Runs once on application startup:
 * 1. Registers the webhook URL with Telegram
 * 2. Sets bot commands visible in the Telegram menu
 * 3. Sets bot description
 */
@Injectable()
export class TelegramBotSetupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramBotSetupService.name);

  constructor(
    private readonly botService: TelegramBotService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — skipping bot setup');
      return;
    }

    const appUrl = this.config.get<string>('APP_URL', '');
    const webhookSecret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', '');

    if (!appUrl || appUrl.includes('localhost')) {
      this.logger.warn(
        'APP_URL is localhost — skipping webhook registration ' +
          '(use a tunnel like ngrok for local testing)',
      );
      // Still set commands even in dev
      await this.setupCommands();
      return;
    }

    const webhookUrl = `${appUrl}/api/v1/telegram/webhook`;

    // Register webhook
    try {
      const ok = await this.botService.setWebhook(webhookUrl, webhookSecret);
      if (ok) {
        this.logger.log(`✅ Webhook registered: ${webhookUrl}`);
      } else {
        this.logger.error(`❌ Failed to register webhook`);
      }
    } catch (err) {
      this.logger.error(`Webhook registration error: ${(err as Error).message}`);
    }

    // Set commands + description
    await this.setupCommands();
    await this.setupDescription();
  }

  private async setupCommands(): Promise<void> {
    await this.botService.setMyCommands([
      { command: 'start',   description: '🎬 ចាប់ផ្តើម / Open Mini App' },
      { command: 'movies',  description: '🔍 រុករករឿង / Browse movies' },
      { command: 'balance', description: '💰 ពិនិត្យសមតុល្យ / Check balance' },
      { command: 'help',    description: '❓ ជំនួយ / Help' },
    ]);
    this.logger.log('✅ Bot commands set');
  }

  private async setupDescription(): Promise<void> {
    await this.botService.setMyDescription(
      '👑 អាធិរាជរឿង\n' +
        'រឿងកម្ពុជា ថៃ ចិន និងអន្តរជាតិ\n' +
        'ភាពយន្ត + ស៊េរីឌុបខ្មែរ\n\n' +
        'ចូលប្រើ Mini App ដើម្បីមើលរឿង!',
    );
    await this.botService.setMyShortDescription(
      '🎬 Khmer Movie Streaming — Telegram Mini App',
    );
  }
}
