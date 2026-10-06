import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => TelegramBotService))
    private readonly telegramBot: TelegramBotService,
  ) {}

  // ─── Deposit notifications ────────────────────────────────────────────────

  async notifyDepositSuccess(userId: string, amount: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: { select: { balance: true } } },
    });
    if (!user) return;

    const setting = await this.prisma.setting.findUnique({
      where: { key: 'notification_deposit_success' },
    });
    if (setting?.value !== 'true') return;

    await this.prisma.notification.create({
      data: {
        userId,
        title: 'ការដាក់ប្រាក់បានជោគជ័យ',
        titleKh: 'ការដាក់ប្រាក់បានជោគជ័យ',
        body: `ប្រាក់ចំនួន $${amount} ត្រូវបានបន្ថែមទៅគណនីរបស់អ្នក`,
        bodyKh: `ប្រាក់ចំនួន $${amount} ត្រូវបានបន្ថែមទៅគណនីរបស់អ្នក`,
        type: NotificationType.DEPOSIT,
      },
    });

    const newBalance = parseFloat(String(user.wallet?.balance ?? 0)).toFixed(2);

    // Rich notification via TelegramBotService (includes Mini App button)
    await this.telegramBot.notifyDepositApproved(
      user.telegramId,
      amount,
      newBalance,
    );
  }

  async notifyDepositFailed(userId: string, amount: string, reason: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.prisma.notification.create({
      data: {
        userId,
        title: 'ការដាក់ប្រាក់មិនបានជោគជ័យ',
        titleKh: 'ការដាក់ប្រាក់មិនបានជោគជ័យ',
        body: `ការដាក់ប្រាក់ $${amount} មិនបានអនុម័ត: ${reason}`,
        bodyKh: `ការដាក់ប្រាក់ $${amount} មិនបានអនុម័ត: ${reason}`,
        type: NotificationType.DEPOSIT,
      },
    });

    await this.telegramBot.notifyDepositRejected(user.telegramId, amount, reason);
  }

  // ─── Purchase notifications ───────────────────────────────────────────────

  async notifyPurchaseSuccess(userId: string, movieTitle: string, movieId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const setting = await this.prisma.setting.findUnique({
      where: { key: 'notification_purchase_success' },
    });
    if (setting?.value !== 'true') return;

    await this.prisma.notification.create({
      data: {
        userId,
        title: 'ការទិញបានជោគជ័យ',
        titleKh: 'ការទិញបានជោគជ័យ',
        body: `អ្នកបានទិញរឿង "${movieTitle}" ដោយជោគជ័យ`,
        bodyKh: `អ្នកបានទិញរឿង "${movieTitle}" ដោយជោគជ័យ`,
        type: NotificationType.PURCHASE,
      },
    });

    await this.telegramBot.notifyPurchaseSuccess(user.telegramId, movieTitle, movieId);
  }

  // ─── New episode notifications ────────────────────────────────────────────

  async notifyNewEpisode(
    movieId: string,
    episodeNumber: number,
    episodeTitle: string,
  ): Promise<void> {
    const purchases = await this.prisma.purchase.findMany({
      where: { movieId },
      select: { userId: true },
    });

    const userIds = purchases.map((p) => p.userId);
    if (userIds.length === 0) return;

    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      select: { title: true, titleKh: true },
    });
    if (!movie) return;

    const setting = await this.prisma.setting.findUnique({
      where: { key: 'notification_new_episode' },
    });
    if (setting?.value !== 'true') return;

    const movieDisplayTitle = movie.titleKh || movie.title;

    // Batch DB notifications
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: 'ភាគថ្មី',
        titleKh: 'ភាគថ្មីបានបន្ថែម',
        body: `${movieDisplayTitle} - ភាគ ${episodeNumber}: ${episodeTitle}`,
        bodyKh: `${movieDisplayTitle} - ភាគ ${episodeNumber}: ${episodeTitle}`,
        type: NotificationType.EPISODE,
      })),
      skipDuplicates: true,
    });

    // Send Telegram messages with rate limiting
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { telegramId: true },
    });

    for (const user of users) {
      await this.telegramBot.notifyNewEpisode(
        user.telegramId,
        movieDisplayTitle,
        episodeNumber,
        episodeTitle,
        movieId,
      );
      // 50ms between messages to stay within Telegram's rate limit
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  // ─── System notification (admin broadcast) ───────────────────────────────

  async createSystemNotification(
    userIds: string[],
    title: string,
    body: string,
    titleKh?: string,
    bodyKh?: string,
  ): Promise<void> {
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title,
        titleKh,
        body,
        bodyKh,
        type: NotificationType.SYSTEM,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Broadcast a Telegram message to all (or a subset of) users
   */
  async broadcastTelegram(
    userIds: string[],
    text: string,
    includeAppButton = true,
  ): Promise<{ sent: number; failed: number }> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: 'ACTIVE' },
      select: { telegramId: true },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        if (includeAppButton) {
          await this.telegramBot.sendMiniAppMessage(user.telegramId, text, '🎬 បើក App');
        } else {
          await this.telegramBot.sendMessage({
            chat_id: user.telegramId,
            text,
            parse_mode: 'HTML',
          });
        }
        sent++;
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    this.logger.log(`Broadcast complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }
}
