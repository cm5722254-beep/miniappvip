import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieStatus, Prisma } from '@prisma/client';

@Injectable()
export class AdminMoviesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll(page: number, limit: number, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { titleKh: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status: status as MovieStatus }),
    };

    const [items, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        include: {
          category: { select: { name: true, nameKh: true } },
          _count: { select: { episodes: true, purchases: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.movie.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        category: true,
        episodes: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { purchases: true } },
      },
    });
    if (!movie) throw new NotFoundException('រកមិនឃើញរឿង');
    return movie;
  }

  async create(dto: CreateMovieDto) {
    return this.prisma.movie.create({
      data: {
        ...dto,
        price: new Prisma.Decimal(dto.price ?? 0),
        tags: dto.tags ?? [],
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateMovieDto) {
    await this.findOne(id);
    return this.prisma.movie.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.price !== undefined && { price: new Prisma.Decimal(dto.price) }),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.movie.delete({ where: { id } });
    return { message: 'រឿងត្រូវបានលប់ចោល' };
  }

  async publish(id: string) {
    await this.findOne(id);
    return this.prisma.movie.update({
      where: { id },
      data: { status: MovieStatus.PUBLISHED },
    });
  }

  async unpublish(id: string) {
    await this.findOne(id);
    return this.prisma.movie.update({
      where: { id },
      data: { status: MovieStatus.UNPUBLISHED },
    });
  }
}
