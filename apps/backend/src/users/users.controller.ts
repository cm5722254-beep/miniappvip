import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/purchases')
  @ApiOperation({ summary: 'Get purchase history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPurchases(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getPurchases(userId, +page, +limit);
  }

  @Get('me/watch-history')
  @ApiOperation({ summary: 'Get watch history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getWatchHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getWatchHistory(userId, +page, +limit);
  }

  @Get('me/favorites')
  @ApiOperation({ summary: 'Get favorites' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFavorites(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getFavorites(userId, +page, +limit);
  }

  @Post('me/favorites/:movieId')
  @ApiOperation({ summary: 'Add movie to favorites' })
  addFavorite(@CurrentUser('id') userId: string, @Param('movieId') movieId: string) {
    return this.usersService.addFavorite(userId, movieId);
  }

  @Delete('me/favorites/:movieId')
  @ApiOperation({ summary: 'Remove movie from favorites' })
  removeFavorite(@CurrentUser('id') userId: string, @Param('movieId') movieId: string) {
    return this.usersService.removeFavorite(userId, movieId);
  }
}
