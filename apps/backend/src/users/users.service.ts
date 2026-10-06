import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({
      where: { telegramId },
      include: {
        wallet: { select: { balance: true, currency: true } },
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: {
          select: { balance: true, currency: true },
        },
        _count: {
          select: {
            purchases: true,
            watchHistory: true,
            favorites: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('រកមិនឃើញអ្នកប្រើប្រាស់');

    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      languageCode: user.languageCode,
      status: user.status,
      createdAt: user.createdAt,
      balance: user.wallet?.balance ?? 0,
      currency: user.wallet?.currency ?? 'USD',
      stats: {
        totalPurchases: user._count.purchases,
        watchHistory: user._count.watchHistory,
        favorites: user._count.favorites,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return { id: user.id, firstName: user.firstName, lastName: user.lastName };
  }

  async getPurchases(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { userId },
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
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchase.count({ where: { userId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getWatchHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.watchHistory.findMany({
        where: { userId },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              titleKh: true,
              posterUrl: true,
            },
          },
          episode: {
            select: {
              id: true,
              episodeNumber: true,
              title: true,
            },
          },
        },
        orderBy: { watchedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.watchHistory.count({ where: { userId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFavorites(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              titleKh: true,
              posterUrl: true,
              price: true,
              isFree: true,
              totalEpisodes: true,
              isPopular: true,
              isNew: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async addFavorite(userId: string, movieId: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new NotFoundException('រកមិនឃើញរឿង');

    await this.prisma.favorite.upsert({
      where: { userId_movieId: { userId, movieId } },
      update: {},
      create: { userId, movieId },
    });

    return { message: 'បានបន្ថែមទៅក្នុងបញ្ជីចូលចិត្ត' };
  }

  async removeFavorite(userId: string, movieId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, movieId },
    });
    return { message: 'បានដកចេញពីបញ្ជីចូលចិត្ត' };
  }
}
