import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminSettingsService } from './admin-settings.service';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';

@ApiTags('Admin - Settings')
@Controller('admin/settings')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  getAll() {
    return this.adminSettingsService.getAll();
  }

  @Patch()
  @ApiOperation({ summary: 'Update settings' })
  update(@Body() updates: Record<string, string>) {
    return this.adminSettingsService.update(updates);
  }
}
