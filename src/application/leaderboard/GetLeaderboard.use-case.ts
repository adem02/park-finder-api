import { Inject, Injectable } from '@nestjs/common';
import { LEADERBOARD_REPOSITORY } from '../../common/constants/injection-tokens.constants';
import type { LeaderboardRepository } from '../gateway';
import {
  LeaderboardEntry,
  UserRankInfo,
  YearMonth,
  getCurrentYearMonth,
} from '../../domain/types/leaderboard.types';

export interface GetLeaderboardRequest {
  month?: YearMonth;
  userId?: string;
}

export interface GetLeaderboardResponse {
  month: YearMonth;
  entries: LeaderboardEntry[];
  userRank: UserRankInfo | null;
}

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    @Inject(LEADERBOARD_REPOSITORY)
    private readonly leaderboardRepository: LeaderboardRepository,
  ) {}

  async execute(
    request: GetLeaderboardRequest = {},
  ): Promise<GetLeaderboardResponse> {
    const month = request.month ?? getCurrentYearMonth();

    const [entries, userRank] = await Promise.all([
      this.leaderboardRepository.getMonthly(month),
      request.userId
        ? this.leaderboardRepository.getUserRankInfo(request.userId, month)
        : Promise.resolve(null),
    ]);

    return { month, entries, userRank };
  }
}
