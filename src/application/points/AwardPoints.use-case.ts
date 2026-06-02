import { Inject, Injectable } from '@nestjs/common';
import {
  LEADERBOARD_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type { LeaderboardRepository, UserRepository } from '../gateway';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { POINTS_PER_ACTION } from '../../domain/constants/points.constants';
import { PointsAction } from '../../domain/types/points.types';
import { getCurrentYearMonth } from '../../domain/types/leaderboard.types';
import { CheckBadgesUseCase } from '../badge/CheckBadges.use-case';

export interface AwardPointsRequest {
  userId: string;
  action: PointsAction;
}

@Injectable()
export class AwardPointsUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(LEADERBOARD_REPOSITORY)
    private readonly leaderboardRepository: LeaderboardRepository,
    private readonly checkBadgesUseCase: CheckBadgesUseCase,
  ) {}

  async execute(request: AwardPointsRequest): Promise<void> {
    const { userId, action } = request;

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException(`User with id ${userId} not found`);
    }

    const delta = POINTS_PER_ACTION[action];

    await this.userRepository.updatePointsById(userId, delta);
    await this.leaderboardRepository.addPoints(
      userId,
      delta,
      getCurrentYearMonth(),
    );

    await this.checkBadgesUseCase.execute({ userId });
  }
}
