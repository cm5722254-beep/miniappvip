import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramBotSetupService } from './telegram-bot-setup.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [TelegramBotController],
  providers: [TelegramBotService, TelegramBotSetupService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
