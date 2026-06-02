import { Inject, Injectable } from '@nestjs/common';
import {
  BADGE_REPOSITORY,
  LEADERBOARD_REPOSITORY,
  PARKING_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  BadgeRepository,
  LeaderboardRepository,
  ParkingRepository,
  UserRepository,
} from '../gateway';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { User } from '../../domain/entities/User';
import { Badge } from '../../domain/entities/Badge';
import { UserStats } from '../../domain/types/user.types';
import { ParkingWithScore } from '../../domain/types/parking.types';
import {
  UserRankInfo,
  getCurrentYearMonth,
} from '../../domain/types/leaderboard.types';

export interface GetUserProfileRequest {
  userId: string;
}

export interface GetUserProfileResponse {
  user: User;
  stats: UserStats;
  badges: Badge[];
  rank: UserRankInfo | null;
  recentParkings: ParkingWithScore[];
}

const RECENT_PARKINGS_LIMIT = 5;

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(BADGE_REPOSITORY)
    private readonly badgeRepository: BadgeRepository,
    @Inject(LEADERBOARD_REPOSITORY)
    private readonly leaderboardRepository: LeaderboardRepository,
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
  ) {}

  async execute(
    request: GetUserProfileRequest,
  ): Promise<GetUserProfileResponse> {
    const { userId } = request;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException(`User with id ${userId} not found`);
    }

    const [stats, badges, rank, recentParkings] = await Promise.all([
      this.userRepository.findStatsByUserId(userId),
      this.badgeRepository.findByUserId(userId),
      this.leaderboardRepository.getUserRankInfo(userId, getCurrentYearMonth()),
      this.parkingRepository.findByUserId(userId),
    ]);

    return {
      user,
      stats,
      badges,
      rank,
      recentParkings: recentParkings.slice(0, RECENT_PARKINGS_LIMIT),
    };
  }
}
