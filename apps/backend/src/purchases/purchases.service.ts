import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MovieStatus, UserStatus, TransactionType, Prisma } from '@prisma/client';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Purchase an entire movie/series
   *
   * Security: price is ALWAYS fetched from DB, never trusted from client
   */
  async purchaseMovie(userId: string, movieId: string) {
    // 1. Verify user is active
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('គណនីរបស់អ្នកមិនអាចទិញបានទេ');
    }

    // 2. Verify movie exists and is published
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie || movie.status !== MovieStatus.PUBLISHED) {
      throw new NotFoundException('រឿងនេះមិនមានទេ');
    }

    // 3. Check for duplicate purchase
    const existingPurchase = await this.prisma.purchase.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });
    if (existingPurchase) {
      throw new ConflictException('អ្នកបានទិញរឿងនេះរួចហើយ');
    }

    // 4. Get REAL price from DB (ignore any client-supplied price)
    const price = new Prisma.Decimal(movie.price);

    // 5. If free, grant access without payment
    if (movie.isFree || price.isZero()) {
      const purchase = await this.prisma.purchase.create({
        data: {
          userId,
          movieId,
          totalAmount: new Prisma.Decimal(0),
          status: 'COMPLETED',
          items: {
            create: {
              itemType: 'MOVIE',
              amount: new Prisma.Decimal(0),
            },
          },
        },
        include: { movie: { select: { title: true, titleKh: true } } },
      });

      this.notifications
        .notifyPurchaseSuccess(userId, movie.titleKh || movie.title, movieId)
        .catch(() => {});

      return { purchase, message: 'អ្នកបានទទួលសិទ្ធិមើលរឿងនេះ' };
    }

    // 6. Paid purchase — run in a transaction
    let purchase: Prisma.PurchaseGetPayload<{ include: { movie: { select: { title: true; titleKh: true } } } }>;

    try {
      purchase = await this.prisma.$transaction(async (tx) => {
        // Lock wallet and check balance within transaction
        await this.walletService.debitBalance(
          userId,
          price,
          `ទិញរឿង: ${movie.titleKh || movie.title}`,
          TransactionType.PURCHASE,
          movieId,
          tx as unknown as Prisma.TransactionClient,
        );

        const newPurchase = await tx.purchase.create({
          data: {
            userId,
            movieId,
            totalAmount: price,
            status: 'COMPLETED',
            items: {
              create: {
                itemType: 'MOVIE',
                amount: price,
              },
            },
          },
          include: { movie: { select: { title: true, titleKh: true } } },
        });

        // Update purchase count
        await tx.movie.update({
          where: { id: movieId },
          data: { purchaseCount: { increment: 1 } },
        });

        return newPurchase;
      });
    } catch (err) {
      // If it's a known business error, rethrow
      if (
        err instanceof BadRequestException ||
        err instanceof ForbiddenException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      this.logger.error(`Purchase failed for user ${userId}, movie ${movieId}:`, err);
      throw new BadRequestException('ការទិញមិនបានជោគជ័យ');
    }

    // 7. Send notification (non-blocking)
    this.notifications
      .notifyPurchaseSuccess(userId, movie.titleKh || movie.title, movieId)
      .catch(() => {});

    return {
      purchase,
      message: 'ការទិញបានជោគជ័យ',
    };
  }

  /**
   * Purchase a single episode
   */
  async purchaseEpisode(userId: string, episodeId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('គណនីរបស់អ្នកមិនអាចទិញបានទេ');
    }

    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { movie: true },
    });

    if (!episode || !episode.isPublished) {
      throw new NotFoundException('ភាគនេះមិនមានទេ');
    }

    if (episode.movie.status !== MovieStatus.PUBLISHED) {
      throw new NotFoundException('រឿងនេះមិនមានទេ');
    }

    // Check if user already bought the whole movie
    const moviePurchase = await this.prisma.purchase.findUnique({
      where: { userId_movieId: { userId, movieId: episode.movieId } },
    });
    if (moviePurchase) {
      throw new ConflictException('អ្នកបានទិញរឿងទាំងមូលរួចហើយ');
    }

    // Check if already bought this episode
    const existingEpPurchase = await this.prisma.purchaseItem.findFirst({
      where: {
        episodeId,
        itemType: 'EPISODE',
        purchase: { userId },
      },
    });
    if (existingEpPurchase) {
      throw new ConflictException('អ្នកបានទិញភាគនេះរួចហើយ');
    }

    const price = new Prisma.Decimal(episode.price);

    if (episode.isFree || price.isZero()) {
      // Find or create a purchase record for this movie (episode bucket)
      let purchase = await this.prisma.purchase.findUnique({
        where: { userId_movieId: { userId, movieId: episode.movieId } },
      });

      if (!purchase) {
        purchase = await this.prisma.purchase.create({
          data: {
            userId,
            movieId: episode.movieId,
            totalAmount: new Prisma.Decimal(0),
            status: 'COMPLETED',
          },
        });
      }

      await this.prisma.purchaseItem.create({
        data: { purchaseId: purchase.id, episodeId, itemType: 'EPISODE', amount: new Prisma.Decimal(0) },
      });

      return { message: 'ភាគនេះឥតគិតថ្លៃ អ្នកអាចមើលបានហើយ' };
    }

    // Paid episode purchase
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.walletService.debitBalance(
          userId,
          price,
          `ទិញភាគ ${episode.episodeNumber}: ${episode.movie.titleKh || episode.movie.title}`,
          TransactionType.PURCHASE,
          episodeId,
          tx as unknown as Prisma.TransactionClient,
        );

        // Upsert purchase bucket
        const purchase = await tx.purchase.upsert({
          where: { userId_movieId: { userId, movieId: episode.movieId } },
          update: { totalAmount: { increment: price } },
          create: {
            userId,
            movieId: episode.movieId,
            totalAmount: price,
            status: 'COMPLETED',
          },
        });

        await tx.purchaseItem.create({
          data: { purchaseId: purchase.id, episodeId, itemType: 'EPISODE', amount: price },
        });
      });
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ConflictException) throw err;
      this.logger.error(`Episode purchase failed for user ${userId}, episode ${episodeId}:`, err);
      throw new BadRequestException('ការទិញភាគមិនបានជោគជ័យ');
    }

    return { message: 'ការទិញភាគបានជោគជ័យ' };
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchase.count({ where: { userId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPurchaseById(userId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, userId },
      include: {
        movie: true,
        items: { include: { episode: true } },
      },
    });

    if (!purchase) throw new NotFoundException('រកមិនឃើញការទិញ');
    return purchase;
  }
}
