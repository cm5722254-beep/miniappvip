import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { DepositStatus, TransactionType, Prisma } from '@prisma/client';

@Injectable()
export class AdminDepositsService {
  private readonly logger = new Logger(AdminDepositsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where = { ...(status && { status: status as DepositStatus }) };

    const [items, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        include: {
          user: { select: { id: true, telegramId: true, username: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deposit.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!deposit) throw new NotFoundException('រកមិនឃើញការដាក់ប្រាក់');
    return deposit;
  }

  /**
   * Approve deposit — atomically credit wallet and mark completed
   */
  async approve(depositId: string, adminId: string, note?: string) {
    const deposit = await this.findOne(depositId);

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException('ការដាក់ប្រាក់នេះមិនស្ថិតក្នុងស្ថានភាព Pending ទេ');
    }

    await this.prisma.$transaction(async (tx) => {
      // Credit wallet
      await this.walletService.creditBalance(
        deposit.userId,
        new Prisma.Decimal(deposit.amount),
        `ការដាក់ប្រាក់ #${depositId}`,
        depositId,
        tx as unknown as Prisma.TransactionClient,
      );

      // Update deposit status
      await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: DepositStatus.COMPLETED,
          adminNote: note,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });
    });

    // Notify user (non-blocking)
    this.notifications
      .notifyDepositSuccess(deposit.userId, deposit.amount.toString())
      .catch(() => {});

    return { message: 'ការដាក់ប្រាក់ត្រូវបានអនុម័ត', depositId };
  }

  /**
   * Reject deposit
   */
  async reject(depositId: string, adminId: string, reason: string) {
    const deposit = await this.findOne(depositId);

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException('ការដាក់ប្រាក់នេះមិនស្ថិតក្នុងស្ថានភាព Pending ទេ');
    }

    await this.prisma.deposit.update({
      where: { id: depositId },
      data: {
        status: DepositStatus.FAILED,
        adminNote: reason,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    // Notify user (non-blocking)
    this.notifications
      .notifyDepositFailed(deposit.userId, deposit.amount.toString(), reason)
      .catch(() => {});

    return { message: 'ការដាក់ប្រាក់ត្រូវបានបដិសេធ', depositId };
  }
}
