import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto } from './dto/deposit.dto';
import { TransactionType, DepositStatus, Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist (should be created on registration)
      return this.prisma.wallet.create({
        data: { userId, balance: 0, currency: 'USD' },
      });
    }

    return {
      id: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
      updatedAt: wallet.updatedAt,
    };
  }

  async getTransactions(userId: string, page: number, limit: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createDeposit(userId: string, dto: CreateDepositDto) {
    // Validate amount bounds from settings
    const [minSetting, maxSetting, paymentMethod] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: 'min_deposit' } }),
      this.prisma.setting.findUnique({ where: { key: 'max_deposit' } }),
      this.prisma.paymentMethod.findFirst({
        where: { provider: dto.paymentMethod, isActive: true },
      }),
    ]);

    const minDeposit = parseFloat(minSetting?.value ?? '1');
    const maxDeposit = parseFloat(maxSetting?.value ?? '1000');

    if (dto.amount < minDeposit) {
      throw new BadRequestException(`ចំនួនទឹកប្រាក់យ៉ាងតិចគឺ $${minDeposit}`);
    }
    if (dto.amount > maxDeposit) {
      throw new BadRequestException(`ចំនួនទឹកប្រាក់យ៉ាងច្រើនគឺ $${maxDeposit}`);
    }

    if (!paymentMethod) {
      throw new BadRequestException('វិធីទូទាត់នេះមិនមានទេ');
    }

    const deposit = await this.prisma.deposit.create({
      data: {
        userId,
        amount: new Prisma.Decimal(dto.amount),
        currency: 'USD',
        paymentMethod: dto.paymentMethod,
        status: DepositStatus.PENDING,
        paymentReference: dto.paymentReference,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return {
      depositId: deposit.id,
      amount: deposit.amount,
      currency: deposit.currency,
      status: deposit.status,
      paymentMethod: paymentMethod.nameKh,
      instructions: paymentMethod.instructionsKh,
      config: {
        // Only return safe, non-secret config for display
        bankName: (paymentMethod.config as Record<string, string>)?.bankName,
        accountNumber: (paymentMethod.config as Record<string, string>)?.accountNumber,
        accountName: (paymentMethod.config as Record<string, string>)?.accountName,
        qrImageUrl: (paymentMethod.config as Record<string, string>)?.qrImageUrl,
      },
      expiresAt: deposit.expiresAt,
      createdAt: deposit.createdAt,
    };
  }

  async getDeposit(userId: string, depositId: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id: depositId, userId },
    });

    if (!deposit) throw new NotFoundException('រកមិនឃើញការដាក់ប្រាក់');
    return deposit;
  }

  async cancelDeposit(userId: string, depositId: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id: depositId, userId },
    });

    if (!deposit) throw new NotFoundException('រកមិនឃើញការដាក់ប្រាក់');

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException('មិនអាចលប់ចោលការដាក់ប្រាក់ដែលបានដំណើរការហើយ');
    }

    await this.prisma.deposit.update({
      where: { id: depositId },
      data: { status: DepositStatus.CANCELLED },
    });

    return { message: 'ការដាក់ប្រាក់ត្រូវបានលប់ចោល' };
  }

  /**
   * INTERNAL: Credit balance atomically
   * Used by admin approval and payment webhooks — never called from user-facing routes
   */
  async creditBalance(
    userId: string,
    amount: Prisma.Decimal,
    description: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;

    // Lock wallet row for update to prevent race conditions
    const wallet = await (db as Prisma.TransactionClient).wallet.findUnique({
      where: { userId },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    const newBalance = new Prisma.Decimal(wallet.balance).add(amount);

    await (db as Prisma.TransactionClient).wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await (db as Prisma.TransactionClient).walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.DEPOSIT,
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        description,
        referenceId,
      },
    });
  }

  /**
   * INTERNAL: Debit balance atomically
   * Throws if insufficient funds
   */
  async debitBalance(
    userId: string,
    amount: Prisma.Decimal,
    description: string,
    type: TransactionType,
    referenceId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;

    const wallet = await (db as Prisma.TransactionClient).wallet.findUnique({
      where: { userId },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    const currentBalance = new Prisma.Decimal(wallet.balance);
    if (currentBalance.lessThan(amount)) {
      throw new BadRequestException('សមតុល្យរបស់អ្នកមិនគ្រប់គ្រាន់ទេ');
    }

    const newBalance = currentBalance.sub(amount);

    await (db as Prisma.TransactionClient).wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await (db as Prisma.TransactionClient).walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        description,
        referenceId,
      },
    });
  }

  async getBalance(userId: string): Promise<Prisma.Decimal> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return new Prisma.Decimal(0);
    return new Prisma.Decimal(wallet.balance);
  }
}
