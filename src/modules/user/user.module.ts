import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import {
  BADGE_REPOSITORY,
  LEADERBOARD_REPOSITORY,
  PARKING_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import { DrizzleUserRepository } from '../../infrastructure/orm/repositories/DrizzleUser.repository';
import { DrizzleBadgeRepository } from '../../infrastructure/orm/repositories/DrizzleBadge.repository';
import { DrizzleLeaderboardRepository } from '../../infrastructure/orm/repositories/DrizzleLeaderboard.repository';
import { DrizzleParkingRepository } from '../../infrastructure/orm/repositories/DrizzleParking.repository';
import { GetUserProfileUseCase } from '../../application/user/GetUserProfile.use-case';
import { GetLeaderboardUseCase } from '../../application/leaderboard/GetLeaderboard.use-case';
import { AwardPointsUseCase } from '../../application/points/AwardPoints.use-case';
import { CheckBadgesUseCase } from '../../application/badge/CheckBadges.use-case';

@Module({
  controllers: [UserController],
  providers: [
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
    { provide: BADGE_REPOSITORY, useClass: DrizzleBadgeRepository },
    { provide: LEADERBOARD_REPOSITORY, useClass: DrizzleLeaderboardRepository },
    { provide: PARKING_REPOSITORY, useClass: DrizzleParkingRepository },
    GetUserProfileUseCase,
    GetLeaderboardUseCase,
    CheckBadgesUseCase,
    AwardPointsUseCase,
  ],
  exports: [AwardPointsUseCase, CheckBadgesUseCase, GetLeaderboardUseCase],
})
export class UserModule {}
