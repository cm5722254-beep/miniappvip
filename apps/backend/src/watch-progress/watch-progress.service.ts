import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WatchProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(userId: string, episodeId: string) {
    return this.prisma.watchProgress.findUnique({
      where: { userId_episodeId: { userId, episodeId } },
    });
  }

  async upsertProgress(
    userId: string,
    episodeId: string,
    position: number,
    duration: number,
  ) {
    // Get episode to find movieId
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { movieId: true },
    });

    if (!episode) return;

    const completed = duration > 0 && position / duration > 0.9;

    return this.prisma.watchProgress.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      update: { position, duration, completed },
      create: {
        userId,
        episodeId,
        movieId: episode.movieId,
        position,
        duration,
        completed,
      },
    });
  }

  async getContinueWatching(userId: string) {
    const progress = await this.prisma.watchProgress.findMany({
      where: { userId, completed: false, position: { gt: 5 } },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            titleKh: true,
            posterUrl: true,
            totalEpisodes: true,
          },
        },
        episode: {
          select: {
            id: true,
            episodeNumber: true,
            title: true,
            titleKh: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return progress;
  }
}
