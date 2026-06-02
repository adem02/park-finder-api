import { User } from '../entities/User';

export type Month =
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | '11'
  | '12';

export type YearMonth = `${number}-${Month}`;

export interface LeaderboardEntry {
  rank: number;
  user: User;
  monthlyPoints: number;
}

export interface UserRankInfo {
  rank: number;
  percentile: string;
  monthlyPoints: number;
}

export function getCurrentYearMonth(date: Date = new Date()): YearMonth {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0') as Month;
  return `${year}-${month}`;
}
