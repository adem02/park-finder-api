import { AwardPointsUseCase } from '../../../../src/application/points/AwardPoints.use-case';
import { CheckBadgesUseCase } from '../../../../src/application/badge/CheckBadges.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { User } from '../../../../src/domain/entities/User';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { POINTS_PER_ACTION } from '../../../../src/domain/constants/points.constants';
import { getCurrentYearMonth } from '../../../../src/domain/types/leaderboard.types';
import type { UserRepository } from '../../../../src/application/gateway/User.repository';
import type { LeaderboardRepository } from '../../../../src/application/gateway/Leaderboard.repository';

const makeUser = (points = 0) =>
  User.create({
    id: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    pointsBalance: PointsBalanceVO.create(points),
    createdAt: new Date(),
  });

const makeUserRepository = (
  overrides: Partial<jest.Mocked<UserRepository>> = {},
): jest.Mocked<UserRepository> => ({
  findById: jest.fn().mockResolvedValue(makeUser()),
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  updatePointsById: jest.fn().mockResolvedValue(undefined),
  findStatsByUserId: jest.fn(),
  ...overrides,
});

const makeLeaderboardRepository = (
  overrides: Partial<jest.Mocked<LeaderboardRepository>> = {},
): jest.Mocked<LeaderboardRepository> => ({
  getMonthly: jest.fn(),
  getUserRankInfo: jest.fn(),
  addPoints: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
  ...overrides,
});

const makeCheckBadges = (): jest.Mocked<
  Pick<CheckBadgesUseCase, 'execute'>
> => ({
  execute: jest.fn().mockResolvedValue({ awardedBadges: [] }),
});

const makeUseCase = (
  overrides: {
    user?: Partial<jest.Mocked<UserRepository>>;
    leaderboard?: Partial<jest.Mocked<LeaderboardRepository>>;
  } = {},
) => {
  const userRepository = makeUserRepository(overrides.user);
  const leaderboardRepository = makeLeaderboardRepository(
    overrides.leaderboard,
  );
  const checkBadgesUseCase = makeCheckBadges();

  const useCase = new AwardPointsUseCase(
    userRepository,
    leaderboardRepository,
    checkBadgesUseCase as unknown as CheckBadgesUseCase,
  );

  return {
    useCase,
    userRepository,
    leaderboardRepository,
    checkBadgesUseCase,
  };
};

describe('AwardPointsUseCase', () => {
  describe('execute', () => {
    it('should throw ResourceNotFoundException when user does not exist', async () => {
      const { useCase } = makeUseCase({
        user: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        useCase.execute({ userId: 'missing', action: 'PARKING_ADDED' }),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should persist the correct points delta for PARKING_ADDED', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute({ userId: 'user-1', action: 'PARKING_ADDED' });

      expect(userRepository.updatePointsById).toHaveBeenCalledWith(
        'user-1',
        POINTS_PER_ACTION.PARKING_ADDED,
      );
    });

    it('should sync the monthly leaderboard with the current month', async () => {
      const { useCase, leaderboardRepository } = makeUseCase();

      await useCase.execute({ userId: 'user-1', action: 'VOTE_CAST' });

      expect(leaderboardRepository.addPoints).toHaveBeenCalledWith(
        'user-1',
        POINTS_PER_ACTION.VOTE_CAST,
        getCurrentYearMonth(),
      );
    });

    it('should trigger the badge check for the user', async () => {
      const { useCase, checkBadgesUseCase } = makeUseCase();

      await useCase.execute({
        userId: 'user-1',
        action: 'AVAILABILITY_REPORTED',
      });

      expect(checkBadgesUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
      });
    });
  });
});
