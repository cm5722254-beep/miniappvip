import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import { UserStatus, TransactionType, Prisma } from '@prisma/client';
import { BalanceAdjustmentDto, BalanceAdjustmentType } from '../dto/balance-adjustment.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async findAll(page: number, limit: number, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where = {
      ...(search && {
        OR: [
          { username: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { telegramId: { contains: search } },
        ],
      }),
      ...(status && { status: status as UserStatus }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          wallet: { select: { balance: true, currency: true } },
          _count: { select: { purchases: true, watchHistory: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        purchases: {
          include: { movie: { select: { title: true, titleKh: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { purchases: true, watchHistory: true } },
      },
    });
    if (!user) throw new NotFoundException('រកមិនឃើញអ្នកប្រើប្រាស់');
    return user;
  }

  async activate(userId: string) {
    const user = await this.findOne(userId);
    return this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } });
  }

  async suspend(userId: string) {
    await this.findOne(userId);
    return this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.SUSPENDED } });
  }

  async ban(userId: string) {
    await this.findOne(userId);
    return this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.BANNED } });
  }

  /**
   * Adjust user balance with mandatory audit trail
   */
  async adjustBalance(userId: string, dto: BalanceAdjustmentDto) {
    await this.findOne(userId);

    const amount = new Prisma.Decimal(dto.amount);

    if (dto.type === BalanceAdjustmentType.CREDIT) {
      await this.walletService.creditBalance(
        userId,
        amount,
        `Admin credit: ${dto.reason}`,
      );
    } else {
      await this.walletService.debitBalance(
        userId,
        amount,
        `Admin debit: ${dto.reason}`,
        TransactionType.ADMIN_DEBIT,
      );
    }

    return { message: 'ការកែប្រែសមតុល្យបានជោគជ័យ' };
  }
}
