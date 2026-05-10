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
