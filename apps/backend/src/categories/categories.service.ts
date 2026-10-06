import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        nameKh: true,
        slug: true,
        imageUrl: true,
        sortOrder: true,
        _count: {
          select: { movies: { where: { status: 'PUBLISHED' } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findMoviesByCategory(slug: string, page: number, limit: number) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('ប្រភេទរឿងនេះមិនមានទេ');

    const skip = (page - 1) * limit;
    const [movies, total] = await Promise.all([
      this.prisma.movie.findMany({
        where: { categoryId: category.id, status: 'PUBLISHED' },
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.movie.count({
        where: { categoryId: category.id, status: 'PUBLISHED' },
      }),
    ]);

    return {
      category: { id: category.id, name: category.name, nameKh: category.nameKh },
      items: movies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
