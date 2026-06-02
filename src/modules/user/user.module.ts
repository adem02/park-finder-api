import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import {
  BADGE_REPOSITORY,
  LEADERBOARD_REPOSITORY,
  PARKING_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import { PrismaUserRepository } from '../../infrastructure/orm/repositories/PrismaUser.repository';
import { PrismaBadgeRepository } from '../../infrastructure/orm/repositories/PrismaBadge.repository';
import { PrismaLeaderboardRepository } from '../../infrastructure/orm/repositories/PrismaLeaderboard.repository';
import { PrismaParkingRepository } from '../../infrastructure/orm/repositories/PrismaParking.repository';
import { GetUserProfileUseCase } from '../../application/user/GetUserProfile.use-case';
import { GetLeaderboardUseCase } from '../../application/leaderboard/GetLeaderboard.use-case';
import { AwardPointsUseCase } from '../../application/points/AwardPoints.use-case';
import { CheckBadgesUseCase } from '../../application/badge/CheckBadges.use-case';

@Module({
  controllers: [UserController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: BADGE_REPOSITORY, useClass: PrismaBadgeRepository },
    { provide: LEADERBOARD_REPOSITORY, useClass: PrismaLeaderboardRepository },
    { provide: PARKING_REPOSITORY, useClass: PrismaParkingRepository },
    GetUserProfileUseCase,
    GetLeaderboardUseCase,
    CheckBadgesUseCase,
    AwardPointsUseCase,
  ],
  exports: [AwardPointsUseCase, CheckBadgesUseCase, GetLeaderboardUseCase],
})
export class UserModule {}
