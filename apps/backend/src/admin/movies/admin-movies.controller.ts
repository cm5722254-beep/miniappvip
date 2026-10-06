import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminMoviesService } from './admin-movies.service';
import { AdminService } from '../admin.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { Request } from 'express';

@ApiTags('Admin - Movies')
@Controller('admin/movies')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
export class AdminMoviesController {
  constructor(
    private readonly adminMoviesService: AdminMoviesService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all movies (admin)' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminMoviesService.findAll(+page, +limit, search, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie detail (admin)' })
  findOne(@Param('id') id: string) {
    return this.adminMoviesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create movie' })
  async create(@Body() dto: CreateMovieDto, @Req() req: Request & { user: { id: string } }) {
    const movie = await this.adminMoviesService.create(dto);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'CREATE_MOVIE',
      targetType: 'Movie',
      targetId: movie.id,
      newValue: { title: movie.title },
    });
    return movie;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update movie' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMovieDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const old = await this.adminMoviesService.findOne(id);
    const updated = await this.adminMoviesService.update(id, dto);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'UPDATE_MOVIE',
      targetType: 'Movie',
      targetId: id,
      oldValue: { title: old.title, price: old.price, status: old.status },
      newValue: dto as object,
    });
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete movie' })
  async delete(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    const result = await this.adminMoviesService.delete(id);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'DELETE_MOVIE',
      targetType: 'Movie',
      targetId: id,
    });
    return result;
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish movie' })
  async publish(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    const result = await this.adminMoviesService.publish(id);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'PUBLISH_MOVIE',
      targetType: 'Movie',
      targetId: id,
    });
    return result;
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish movie' })
  async unpublish(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    const result = await this.adminMoviesService.unpublish(id);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'UNPUBLISH_MOVIE',
      targetType: 'Movie',
      targetId: id,
    });
    return result;
  }
}
