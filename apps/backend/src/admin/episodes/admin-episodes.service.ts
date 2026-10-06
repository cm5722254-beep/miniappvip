import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { PartialType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminEpisodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findByMovie(movieId: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new NotFoundException('រកមិនឃើញរឿង');

    return this.prisma.episode.findMany({
      where: { movieId },
      include: {
        videoAssets: true,
        subtitles: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(movieId: string, dto: CreateEpisodeDto) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new NotFoundException('រកមិនឃើញរឿង');

    const episode = await this.prisma.episode.create({
      data: {
        movieId,
        episodeNumber: dto.episodeNumber,
        title: dto.title,
        titleKh: dto.titleKh,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        duration: dto.duration,
        price: new Prisma.Decimal(dto.price ?? 0),
        isFree: dto.isFree ?? false,
        isPublished: dto.isPublished ?? true,
        sortOrder: dto.sortOrder ?? dto.episodeNumber,
      },
    });

    // Update movie total episode count
    await this.prisma.movie.update({
      where: { id: movieId },
      data: { totalEpisodes: { increment: 1 } },
    });

    return episode;
  }

  async update(episodeId: string, dto: Partial<CreateEpisodeDto>) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) throw new NotFoundException('រកមិនឃើញភាគ');

    return this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        ...dto,
        ...(dto.price !== undefined && { price: new Prisma.Decimal(dto.price) }),
      },
    });
  }

  async delete(episodeId: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) throw new NotFoundException('រកមិនឃើញភាគ');

    await this.prisma.episode.delete({ where: { id: episodeId } });

    // Decrement movie episode count
    await this.prisma.movie.update({
      where: { id: episode.movieId },
      data: { totalEpisodes: { decrement: 1 } },
    });

    return { message: 'ភាគត្រូវបានលប់ចោល' };
  }

  async addVideoAsset(episodeId: string, quality: string, storageKey: string, size?: bigint) {
    return this.prisma.videoAsset.upsert({
      where: { episodeId_quality: { episodeId, quality } },
      update: { storageKey, size, isReady: true },
      create: {
        episodeId,
        quality,
        storageKey,
        size,
        mimeType: 'video/mp4',
        isReady: true,
      },
    });
  }
}
