import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, Req, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminEpisodesService } from './admin-episodes.service';
import { AdminService } from '../admin.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { StorageService } from '../../storage/storage.service';
import { Request } from 'express';

@ApiTags('Admin - Episodes')
@Controller('admin')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
export class AdminEpisodesController {
  constructor(
    private readonly adminEpisodesService: AdminEpisodesService,
    private readonly adminService: AdminService,
    private readonly storageService: StorageService,
  ) {}

  @Get('movies/:movieId/episodes')
  @ApiOperation({ summary: 'List episodes for movie' })
  findByMovie(@Param('movieId') movieId: string) {
    return this.adminEpisodesService.findByMovie(movieId);
  }

  @Post('movies/:movieId/episodes')
  @ApiOperation({ summary: 'Create episode' })
  async create(
    @Param('movieId') movieId: string,
    @Body() dto: CreateEpisodeDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const episode = await this.adminEpisodesService.create(movieId, dto);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'CREATE_EPISODE',
      targetType: 'Episode',
      targetId: episode.id,
      newValue: { episodeNumber: dto.episodeNumber, title: dto.title },
    });
    return episode;
  }

  @Patch('episodes/:id')
  @ApiOperation({ summary: 'Update episode' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEpisodeDto>,
    @Req() req: Request & { user: { id: string } },
  ) {
    const result = await this.adminEpisodesService.update(id, dto);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'UPDATE_EPISODE',
      targetType: 'Episode',
      targetId: id,
      newValue: dto as object,
    });
    return result;
  }

  @Delete('episodes/:id')
  @ApiOperation({ summary: 'Delete episode' })
  async delete(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    const result = await this.adminEpisodesService.delete(id);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'DELETE_EPISODE',
      targetType: 'Episode',
      targetId: id,
    });
    return result;
  }

  @Post('episodes/:id/upload')
  @ApiOperation({ summary: 'Upload video for episode' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('video', {
      limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB max
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('video/')) {
          return cb(new Error('Only video files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadVideo(
    @Param('id') episodeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('quality') quality = '720p',
    @Req() req: Request & { user: { id: string } },
  ) {
    const episode = await this.adminEpisodesService['prisma'].episode.findUnique({
      where: { id: episodeId },
    });
    if (!episode) return { message: 'Episode not found' };

    const key = this.storageService.generateVideoKey(
      episode.movieId,
      episodeId,
      quality,
    );

    await this.storageService.uploadFile(file.buffer, key, file.mimetype);
    await this.adminEpisodesService.addVideoAsset(episodeId, quality, key, BigInt(file.size));

    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'UPLOAD_VIDEO',
      targetType: 'Episode',
      targetId: episodeId,
      newValue: { quality, key },
    });

    return { message: 'Video uploaded successfully', key, quality };
  }
}
