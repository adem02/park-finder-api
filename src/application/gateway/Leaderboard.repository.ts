import {
  LeaderboardEntry,
  UserRankInfo,
  YearMonth,
} from '../../domain/types/leaderboard.types';

export interface LeaderboardRepository {
  getMonthly(month: YearMonth): Promise<LeaderboardEntry[]>;
  getUserRankInfo(
    userId: string,
    month: YearMonth,
  ): Promise<UserRankInfo | null>;
  addPoints(userId: string, points: number, month: YearMonth): Promise<void>;
  /** Takes points back from an existing entry (never below 0) and recomputes the month's ranks. */
  withdrawPoints(
    userId: string,
    points: number,
    month: YearMonth,
  ): Promise<void>;
  reset(month: YearMonth): Promise<void>;
}
