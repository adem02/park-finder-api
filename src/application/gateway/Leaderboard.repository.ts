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
  reset(month: YearMonth): Promise<void>;
}
