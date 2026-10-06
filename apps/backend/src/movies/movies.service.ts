import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MovieQueryDto } from './dto/movie-query.dto';
import { MovieStatus, UserStatus } from '@prisma/client';

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private readonly MOVIE_SELECT = {
    id: true,
    title: true,
    titleKh: true,
    posterUrl: true,
    bannerUrl: true,
    year: true,
    totalEpisodes: true,
    price: true,
    isFree: true,
    isPopular: true,
    isNew: true,
    isFeatured: true,
    rating: true,
    viewCount: true,
    purchaseCount: true,
    status: true,
    tags: true,
    createdAt: true,
    category: {
      select: { id: true, name: true, nameKh: true, slug: true },
    },
  } as const;

  async findAll(query: MovieQueryDto) {
    const { category, search, sort, page = 1, limit = 20, isFree } = query;
    const skip = (page - 1) * limit;

    const where: object = {
      status: MovieStatus.PUBLISHED,
      ...(category && { category: { slug: category } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { titleKh: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      }),
      ...(isFree !== undefined && { isFree: isFree === true }),
    };

    const orderBy = this.buildOrderBy(sort);

    const [movies, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        select: this.MOVIE_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.movie.count({ where }),
    ]);

    return { items: movies, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFeaturedSections() {
    const [popular, newMovies, featured] = await Promise.all([
      this.prisma.movie.findMany({
        where: { status: MovieStatus.PUBLISHED, isPopular: true },
        select: this.MOVIE_SELECT,
        orderBy: { purchaseCount: 'desc' },
        take: 10,
      }),
      this.prisma.movie.findMany({
        where: { status: MovieStatus.PUBLISHED, isNew: true },
        select: this.MOVIE_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.movie.findMany({
        where: { status: MovieStatus.PUBLISHED, isFeatured: true },
        select: this.MOVIE_SELECT,
        orderBy: { viewCount: 'desc' },
        take: 10,
      }),
    ]);

    return { popular, newMovies, featured };
  }

  async findOne(id: string, userId?: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, nameKh: true, slug: true } },
        _count: { select: { purchases: true } },
      },
    });

    if (!movie || movie.status !== MovieStatus.PUBLISHED) {
      throw new NotFoundException('រឿងនេះមិនមានទេ');
    }

    // Increment view count (fire-and-forget)
    this.prisma.movie.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    let isPurchased = false;
    if (userId) {
      const purchase = await this.prisma.purchase.findUnique({
        where: { userId_movieId: { userId, movieId: id } },
      });
      isPurchased = !!purchase;
    }

    return { ...movie, isPurchased };
  }

  async getEpisodes(movieId: string, userId?: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie || movie.status !== MovieStatus.PUBLISHED) {
      throw new NotFoundException('រឿងនេះមិនមានទេ');
    }

    const episodes = await this.prisma.episode.findMany({
      where: { movieId, isPublished: true },
      select: {
        id: true,
        episodeNumber: true,
        title: true,
        titleKh: true,
        thumbnailUrl: true,
        duration: true,
        price: true,
        isFree: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Determine access for each episode
    let moviePurchased = false;
    const episodePurchaseMap = new Map<string, boolean>();

    if (userId) {
      const [moviePurchase, episodePurchases] = await Promise.all([
        this.prisma.purchase.findUnique({
          where: { userId_movieId: { userId, movieId } },
        }),
        this.prisma.purchaseItem.findMany({
          where: {
            purchase: { userId },
            episodeId: { in: episodes.map((e) => e.id) },
            itemType: 'EPISODE',
          },
          select: { episodeId: true },
        }),
      ]);

      moviePurchased = !!moviePurchase;
      episodePurchases.forEach((ep) => {
        if (ep.episodeId) episodePurchaseMap.set(ep.episodeId, true);
      });
    }

    return episodes.map((ep) => ({
      ...ep,
      isLocked: !ep.isFree && !moviePurchased && !episodePurchaseMap.get(ep.id),
    }));
  }

  /**
   * Authorize and return signed playback URL for a movie (first episode)
   */
  async authorizeMovieWatch(movieId: string, userId: string) {
    const movie = await this.findOne(movieId, userId);
    if (!movie.isFree && !movie.isPurchased) {
      throw new ForbiddenException('អ្នកមិនទាន់បានទិញរឿងនេះទេ');
    }

    const firstEpisode = await this.prisma.episode.findFirst({
      where: { movieId, isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (!firstEpisode) {
      throw new NotFoundException('មិនទាន់មានភាគទេ');
    }

    return this.authorizeEpisodeWatch(movieId, firstEpisode.id, userId);
  }

  /**
   * Authorize and return signed playback URL for a specific episode
   * This is the core access control — all checks happen here
   */
  async authorizeEpisodeWatch(movieId: string, episodeId: string, userId: string) {
    // 1. Verify user account is active
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('គណនីរបស់អ្នកមិនសកម្មទេ');
    }

    // 2. Verify movie exists and published
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie || movie.status !== MovieStatus.PUBLISHED) {
      throw new NotFoundException('រឿងនេះមិនមានទេ');
    }

    // 3. Verify episode exists and published
    const episode = await this.prisma.episode.findFirst({
      where: { id: episodeId, movieId, isPublished: true },
      include: {
        videoAssets: {
          where: { isReady: true },
          select: { quality: true, storageKey: true },
          orderBy: { quality: 'desc' },
        },
        subtitles: {
          select: { id: true, language: true, languageName: true, isDefault: true, storageKey: true },
        },
      },
    });

    if (!episode) {
      throw new NotFoundException('ភាគនេះមិនមានទេ');
    }

    // 4. Check access: free movie, free episode, movie purchase, episode purchase
    let hasAccess = false;

    if (movie.isFree || episode.isFree) {
      hasAccess = true;
    } else {
      const [moviePurchase, episodePurchase] = await Promise.all([
        this.prisma.purchase.findUnique({
          where: { userId_movieId: { userId, movieId } },
        }),
        this.prisma.purchaseItem.findFirst({
          where: {
            episodeId,
            itemType: 'EPISODE',
            purchase: { userId },
          },
        }),
      ]);

      hasAccess = !!(moviePurchase || episodePurchase);
    }

    if (!hasAccess) {
      throw new ForbiddenException('អ្នកមិនទាន់បានទិញរឿងនេះទេ');
    }

    // 5. No video assets? Return error
    if (!episode.videoAssets.length) {
      throw new BadRequestException('វីដេអូមិនទាន់ត្រូវបានដំណើរការទេ');
    }

    // 6. Generate signed URLs for all available qualities
    const playbackUrls = await Promise.all(
      episode.videoAssets.map(async (asset) => ({
        quality: asset.quality,
        url: await this.storage.getSignedUrl(asset.storageKey, 3600),
      })),
    );

    // 7. Generate signed subtitle URLs
    const subtitleUrls = await Promise.all(
      episode.subtitles.map(async (sub) => ({
        id: sub.id,
        language: sub.language,
        languageName: sub.languageName,
        isDefault: sub.isDefault,
        url: await this.storage.getSignedUrl(sub.storageKey, 3600),
      })),
    );

    // 8. Get watch progress
    const watchProgress = await this.prisma.watchProgress.findUnique({
      where: { userId_episodeId: { userId, episodeId } },
    });

    // 9. Record watch history (fire-and-forget)
    this.prisma.watchHistory
      .create({ data: { userId, movieId, episodeId } })
      .catch(() => {});

    return {
      episodeId,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      titleKh: episode.titleKh,
      playbackUrls,
      subtitles: subtitleUrls,
      resumePosition: watchProgress?.position ?? 0,
      duration: episode.duration ?? 0,
    };
  }

  private buildOrderBy(sort?: string): object {
    switch (sort) {
      case 'popular':
        return { purchaseCount: 'desc' };
      case 'new':
        return { isNew: 'desc' };
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }
}
