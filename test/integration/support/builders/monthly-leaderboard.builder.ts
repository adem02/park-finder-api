import { randomUUID } from 'node:crypto';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { monthlyLeaderboard } from '../../../../src/infrastructure/orm/drizzle/schema';
import { UserBuilder } from './user.builder';

export interface MonthlyLeaderboardRow {
  id: string;
  userId: string;
  month: string;
  monthlyPoints: number;
  rank: number;
}

const currentMonth = (): string => new Date().toISOString().slice(0, 7); // YYYY-MM

/**
 * Builder for the `monthly_leaderboard` table. Auto-creates a default user
 * if not provided; defaults to the current month.
 */
export class MonthlyLeaderboardBuilder {
  private row: MonthlyLeaderboardRow;

  constructor(private readonly drizzleService: DrizzleService) {
    this.row = {
      id: randomUUID(),
      userId: '',
      month: currentMonth(),
      monthlyPoints: 0,
      rank: 1,
    };
  }

  forUser(userId: string): this {
    this.row.userId = userId;
    return this;
  }

  withMonth(month: string): this {
    this.row.month = month;
    return this;
  }

  withMonthlyPoints(monthlyPoints: number): this {
    this.row.monthlyPoints = monthlyPoints;
    return this;
  }

  withRank(rank: number): this {
    this.row.rank = rank;
    return this;
  }

  build(): MonthlyLeaderboardRow {
    return { ...this.row };
  }

  async create(): Promise<MonthlyLeaderboardRow> {
    if (!this.row.userId) {
      const user = await new UserBuilder(this.drizzleService).create();
      this.row.userId = user.id;
    }
    await this.drizzleService.db.insert(monthlyLeaderboard).values(this.row);
    return this.build();
  }
}
