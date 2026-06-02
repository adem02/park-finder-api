import { Injectable } from '@nestjs/common';
import { LeaderboardRepository } from '../../../application/gateway/Leaderboard.repository';
import {
  LeaderboardEntry,
  UserRankInfo,
  YearMonth,
} from '../../../domain/types/leaderboard.types';
import { UuidGenerator } from '../../../common/utils/UuidGenerator';
import { PrismaService } from '../prisma/Prisma.service';
import { UserMapper } from '../mapper/User.mapper';

@Injectable()
export class PrismaLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getMonthly(month: YearMonth): Promise<LeaderboardEntry[]> {
    const rows = await this.prismaService.monthlyLeaderboard.findMany({
      where: { month },
      orderBy: { monthlyPoints: 'desc' },
      include: { user: true },
    });

    return rows.map((row) => ({
      rank: row.rank,
      user: UserMapper.toDomain(row.user),
      monthlyPoints: row.monthlyPoints,
    }));
  }

  async getUserRankInfo(
    userId: string,
    month: YearMonth,
  ): Promise<UserRankInfo | null> {
    const entry = await this.prismaService.monthlyLeaderboard.findUnique({
      where: { userId_month: { userId, month } },
    });

    if (!entry) return null;

    const total = await this.prismaService.monthlyLeaderboard.count({
      where: { month },
    });

    const percentile =
      total === 0
        ? '0%'
        : `${Math.max(1, Math.round((entry.rank / total) * 100))}%`;

    return {
      rank: entry.rank,
      percentile,
      monthlyPoints: entry.monthlyPoints,
    };
  }

  async addPoints(
    userId: string,
    points: number,
    month: YearMonth,
  ): Promise<void> {
    await this.prismaService.monthlyLeaderboard.upsert({
      where: { userId_month: { userId, month } },
      create: {
        id: UuidGenerator.Generate(),
        userId,
        month,
        monthlyPoints: points,
        rank: 0,
      },
      update: {
        monthlyPoints: { increment: points },
      },
    });

    await this.recalculateRanks(month);
  }

  async reset(month: YearMonth): Promise<void> {
    await this.prismaService.monthlyLeaderboard.deleteMany({
      where: { month },
    });
  }

  private async recalculateRanks(month: YearMonth): Promise<void> {
    await this.prismaService.$executeRaw`
      UPDATE monthly_leaderboard ml
      SET rank = sub.rnk
      FROM (
        SELECT id, RANK() OVER (ORDER BY "monthlyPoints" DESC) AS rnk
        FROM monthly_leaderboard
        WHERE month = ${month}
      ) sub
      WHERE ml.id = sub.id AND ml.month = ${month}
    `;
  }
}
