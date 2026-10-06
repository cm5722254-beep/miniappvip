import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { MovieQueryDto } from './dto/movie-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get paginated movie list' })
  findAll(@Query() query: MovieQueryDto) {
    return this.moviesService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured sections for home page' })
  getFeatured() {
    return this.moviesService.getFeaturedSections();
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get movie detail' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.moviesService.findOne(id, userId);
  }

  @Get(':id/episodes')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get episode list with lock status' })
  getEpisodes(@Param('id') movieId: string, @CurrentUser('id') userId?: string) {
    return this.moviesService.getEpisodes(movieId, userId);
  }

  @Get(':id/watch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Authorize and get signed playback URL for movie' })
  watchMovie(@Param('id') movieId: string, @CurrentUser('id') userId: string) {
    return this.moviesService.authorizeMovieWatch(movieId, userId);
  }

  @Get(':movieId/episodes/:episodeId/watch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Authorize and get signed playback URL for episode' })
  watchEpisode(
    @Param('movieId') movieId: string,
    @Param('episodeId') episodeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.moviesService.authorizeEpisodeWatch(movieId, episodeId, userId);
  }
}
