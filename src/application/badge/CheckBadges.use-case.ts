import { Inject, Injectable } from '@nestjs/common';
import {
  BADGE_REPOSITORY,
  PARKING_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  BadgeRepository,
  ParkingRepository,
  UserRepository,
} from '../gateway';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { Badge } from '../../domain/entities/Badge';

export interface CheckBadgesRequest {
  userId: string;
}

export interface CheckBadgesResponse {
  awardedBadges: Badge[];
}

@Injectable()
export class CheckBadgesUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY)
    private readonly badgeRepository: BadgeRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
  ) {}

  async execute(request: CheckBadgesRequest): Promise<CheckBadgesResponse> {
    const { userId } = request;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException(`User with id ${userId} not found`);
    }

    const [allBadges, ownedBadges, stats, userParkings] = await Promise.all([
      this.badgeRepository.findAll(),
      this.badgeRepository.findByUserId(userId),
      this.userRepository.findStatsByUserId(userId),
      this.parkingRepository.findByUserId(userId),
    ]);

    const ownedIds = new Set(ownedBadges.map((b) => b.id));
    const awardedBadges: Badge[] = [];

    for (const badge of allBadges) {
      if (ownedIds.has(badge.id)) continue;

      const earned = this.matchesCriteria(badge, stats, userParkings);
      if (!earned) continue;

      await this.badgeRepository.assignToUser(userId, badge);
      awardedBadges.push(badge);
    }

    return { awardedBadges };
  }

  private matchesCriteria(
    badge: Badge,
    stats: { parkingsAdded: number },
    userParkings: { score: { upvotes: number }; votesCount: number }[],
  ): boolean {
    switch (badge.criteria.type) {
      case 'parkings_added':
        return stats.parkingsAdded >= badge.criteria.threshold;

      case 'votes_positive_ratio': {
        const totalVotes = userParkings.reduce(
          (sum, p) => sum + p.votesCount,
          0,
        );
        if (totalVotes === 0) return false;
        const positive = userParkings.reduce(
          (sum, p) => sum + p.score.upvotes,
          0,
        );
        const ratio = (positive / totalVotes) * 100;
        return ratio >= badge.criteria.threshold;
      }
    }
  }
}
