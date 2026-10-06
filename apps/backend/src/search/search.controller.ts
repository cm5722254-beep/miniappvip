import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search movies' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(
    @Query('q') q: string,
    @Query('category') category?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.searchService.search(q, category, +page, +limit);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Search autocomplete suggestions' })
  @ApiQuery({ name: 'q', required: true, type: String })
  getSuggestions(@Query('q') q: string) {
    return this.searchService.getSuggestions(q);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular search terms' })
  getPopular() {
    return this.searchService.getPopularSearches();
  }
}
