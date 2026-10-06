import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MoviesModule } from './movies/movies.module';
import { CategoriesModule } from './categories/categories.module';
import { EpisodesModule } from './episodes/episodes.module';
import { WalletModule } from './wallet/wallet.module';
import { PurchasesModule } from './purchases/purchases.module';
import { WatchProgressModule } from './watch-progress/watch-progress.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';

@Module({
  imports: [
    // ─── Config (global) ───
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ─── Rate Limiting ───
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_WINDOW_MS', 60000),
            limit: config.get<number>('RATE_LIMIT_MAX', 100),
          },
        ],
      }),
    }),

    // ─── Database ───
    PrismaModule,

    // ─── Feature Modules ───
    AuthModule,
    UsersModule,
    MoviesModule,
    CategoriesModule,
    EpisodesModule,
    WalletModule,
    PurchasesModule,
    WatchProgressModule,
    SearchModule,
    StorageModule,
    PaymentModule,
    NotificationsModule,
    AdminModule,
    TelegramBotModule,
  ],
})
export class AppModule {}
