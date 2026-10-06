import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovieStatus } from '@prisma/client';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, category?: string, page = 1, limit = 20) {
    if (!q || q.trim().length < 2) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const skip = (page - 1) * limit;
    const searchTerm = q.trim();

    const where = {
      status: MovieStatus.PUBLISHED,
      ...(category && { category: { slug: category } }),
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' as const } },
        { titleKh: { contains: searchTerm, mode: 'insensitive' as const } },
        { description: { contains: searchTerm, mode: 'insensitive' as const } },
        { descriptionKh: { contains: searchTerm, mode: 'insensitive' as const } },
        { tags: { has: searchTerm } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        select: {
          id: true,
          title: true,
          titleKh: true,
          posterUrl: true,
          year: true,
          price: true,
          isFree: true,
          totalEpisodes: true,
          isPopular: true,
          isNew: true,
          rating: true,
          category: { select: { name: true, nameKh: true, slug: true } },
        },
        orderBy: [{ isPopular: 'desc' }, { purchaseCount: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.movie.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit), query: q };
  }

  async getSuggestions(q: string) {
    if (!q || q.trim().length < 1) return [];

    const movies = await this.prisma.movie.findMany({
      where: {
        status: MovieStatus.PUBLISHED,
        OR: [
          { title: { startsWith: q, mode: 'insensitive' } },
          { titleKh: { startsWith: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, titleKh: true, posterUrl: true },
      take: 8,
      orderBy: { purchaseCount: 'desc' },
    });

    return movies;
  }

  async getPopularSearches() {
    // Return popular movies as search suggestions
    return this.prisma.movie.findMany({
      where: { status: MovieStatus.PUBLISHED, isPopular: true },
      select: { id: true, title: true, titleKh: true, purchaseCount: true },
      orderBy: { purchaseCount: 'desc' },
      take: 10,
    });
  }
}
