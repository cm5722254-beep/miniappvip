import { Controller, Post, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Purchases')
@Controller('purchases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('movie/:movieId')
  @ApiOperation({ summary: 'Purchase entire movie' })
  purchaseMovie(
    @CurrentUser('id') userId: string,
    @Param('movieId') movieId: string,
  ) {
    return this.purchasesService.purchaseMovie(userId, movieId);
  }

  @Post('episode/:episodeId')
  @ApiOperation({ summary: 'Purchase single episode' })
  purchaseEpisode(
    @CurrentUser('id') userId: string,
    @Param('episodeId') episodeId: string,
  ) {
    return this.purchasesService.purchaseEpisode(userId, episodeId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user purchase history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPurchases(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.purchasesService.getPurchases(userId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase detail' })
  getPurchaseById(
    @CurrentUser('id') userId: string,
    @Param('id') purchaseId: string,
  ) {
    return this.purchasesService.getPurchaseById(userId, purchaseId);
  }
}
