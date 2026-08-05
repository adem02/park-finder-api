import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { LeaderboardRepository } from '../../../application/gateway/Leaderboard.repository';
import {
  LeaderboardEntry,
  UserRankInfo,
  YearMonth,
} from '../../../domain/types/leaderboard.types';
import { UuidGenerator } from '../../../common/utils/UuidGenerator';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { monthlyLeaderboard, users } from '../drizzle/schema';
import { UserMapper } from '../mapper/User.mapper';

@Injectable()
export class DrizzleLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getMonthly(month: YearMonth): Promise<LeaderboardEntry[]> {
    const rows = await this.drizzleService.db
      .select({ entry: monthlyLeaderboard, user: users })
      .from(monthlyLeaderboard)
      .innerJoin(users, eq(monthlyLeaderboard.userId, users.id))
      .where(eq(monthlyLeaderboard.month, month))
      .orderBy(desc(monthlyLeaderboard.monthlyPoints));

    return rows.map((row) => ({
      rank: row.entry.rank,
      user: UserMapper.toDomain(row.user),
      monthlyPoints: row.entry.monthlyPoints,
    }));
  }

  async getUserRankInfo(
    userId: string,
    month: YearMonth,
  ): Promise<UserRankInfo | null> {
    const [entry] = await this.drizzleService.db
      .select()
      .from(monthlyLeaderboard)
      .where(
        and(
          eq(monthlyLeaderboard.userId, userId),
          eq(monthlyLeaderboard.month, month),
        ),
      )
      .limit(1);

    if (!entry) return null;

    const [{ value: total }] = await this.drizzleService.db
      .select({ value: count() })
      .from(monthlyLeaderboard)
      .where(eq(monthlyLeaderboard.month, month));

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
    await this.drizzleService.db
      .insert(monthlyLeaderboard)
      .values({
        id: UuidGenerator.Generate(),
        userId,
        month,
        monthlyPoints: points,
        rank: 0,
      })
      .onConflictDoUpdate({
        target: [monthlyLeaderboard.userId, monthlyLeaderboard.month],
        set: {
          monthlyPoints: sql`${monthlyLeaderboard.monthlyPoints} + ${points}`,
        },
      });

    await this.recalculateRanks(month);
  }

  async reset(month: YearMonth): Promise<void> {
    await this.drizzleService.db
      .delete(monthlyLeaderboard)
      .where(eq(monthlyLeaderboard.month, month));
  }

  private async recalculateRanks(month: YearMonth): Promise<void> {
    await this.drizzleService.db.execute(sql`
      UPDATE monthly_leaderboard ml
      SET rank = sub.rnk
      FROM (
        SELECT id, RANK() OVER (ORDER BY "monthlyPoints" DESC) AS rnk
        FROM monthly_leaderboard
        WHERE month = ${month}
      ) sub
      WHERE ml.id = sub.id AND ml.month = ${month}
    `);
  }
}
