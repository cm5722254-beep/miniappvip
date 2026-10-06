import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminMoviesService } from './movies/admin-movies.service';
import { AdminMoviesController } from './movies/admin-movies.controller';
import { AdminEpisodesService } from './episodes/admin-episodes.service';
import { AdminEpisodesController } from './episodes/admin-episodes.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminDepositsService } from './deposits/admin-deposits.service';
import { AdminDepositsController } from './deposits/admin-deposits.controller';
import { AdminSettingsService } from './settings/admin-settings.service';
import { AdminSettingsController } from './settings/admin-settings.controller';
import { StorageModule } from '../storage/storage.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [StorageModule, WalletModule, NotificationsModule],
  controllers: [
    AdminController,
    AdminMoviesController,
    AdminEpisodesController,
    AdminUsersController,
    AdminDepositsController,
    AdminSettingsController,
  ],
  providers: [
    AdminService,
    AdminMoviesService,
    AdminEpisodesService,
    AdminUsersService,
    AdminDepositsService,
    AdminSettingsService,
  ],
})
export class AdminModule {}
