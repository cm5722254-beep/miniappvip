import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WatchProgressService } from './watch-progress.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateProgressDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  position: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration: number;
}

@ApiTags('Watch Progress')
@Controller('watch-progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WatchProgressController {
  constructor(private readonly watchProgressService: WatchProgressService) {}

  @Get('continue-watching')
  @ApiOperation({ summary: 'Get continue watching list' })
  getContinueWatching(@CurrentUser('id') userId: string) {
    return this.watchProgressService.getContinueWatching(userId);
  }

  @Get(':episodeId')
  @ApiOperation({ summary: 'Get watch progress for episode' })
  getProgress(
    @CurrentUser('id') userId: string,
    @Param('episodeId') episodeId: string,
  ) {
    return this.watchProgressService.getProgress(userId, episodeId);
  }

  @Post(':episodeId')
  @ApiOperation({ summary: 'Update watch progress' })
  upsertProgress(
    @CurrentUser('id') userId: string,
    @Param('episodeId') episodeId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.watchProgressService.upsertProgress(
      userId,
      episodeId,
      dto.position,
      dto.duration,
    );
  }
}
