import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      totalMovies,
      publishedMovies,
      totalEpisodes,
      todaySales,
      totalRevenue,
      pendingDeposits,
      completedDeposits,
      popularMovies,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.movie.count(),
      this.prisma.movie.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.episode.count(),
      this.prisma.purchase.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: today }, status: 'COMPLETED' },
      }),
      this.prisma.purchase.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.deposit.count({ where: { status: 'PENDING' } }),
      this.prisma.deposit.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.movie.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { purchaseCount: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          titleKh: true,
          posterUrl: true,
          purchaseCount: true,
          price: true,
        },
      }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers },
      content: { totalMovies, publishedMovies, totalEpisodes },
      revenue: {
        todaySales: todaySales._sum.totalAmount ?? new Decimal(0),
        totalRevenue: totalRevenue._sum.totalAmount ?? new Decimal(0),
        totalDeposits: completedDeposits._sum.amount ?? new Decimal(0),
        pendingDeposits,
      },
      popularMovies,
    };
  }

  async createAuditLog(params: {
    adminId: string;
    action: string;
    targetType: string;
    targetId?: string;
    oldValue?: object;
    newValue?: object;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        oldValue: params.oldValue as object,
        newValue: params.newValue as object,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async getAuditLogs(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        include: { admin: { select: { username: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
