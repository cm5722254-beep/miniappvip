import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [forwardRef(() => TelegramBotModule)],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
