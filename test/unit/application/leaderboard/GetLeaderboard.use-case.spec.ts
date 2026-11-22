import { GetLeaderboardUseCase } from '../../../../src/application/leaderboard/GetLeaderboard.use-case';
import { User } from '../../../../src/domain/entities/User';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import {
  YearMonth,
  getCurrentYearMonth,
} from '../../../../src/domain/types/leaderboard.types';
import type { LeaderboardRepository } from '../../../../src/application/gateway/Leaderboard.repository';

const makeUser = (id: string) =>
  User.create({
    id,
    username: `user-${id}`,
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeLeaderboardRepository = (
  overrides: Partial<jest.Mocked<LeaderboardRepository>> = {},
): jest.Mocked<LeaderboardRepository> => ({
  getMonthly: jest.fn().mockResolvedValue([
    { rank: 1, user: makeUser('a'), monthlyPoints: 200 },
    { rank: 2, user: makeUser('b'), monthlyPoints: 100 },
  ]),
  getUserRankInfo: jest
    .fn()
    .mockResolvedValue({ rank: 5, percentile: '5%', monthlyPoints: 50 }),
  addPoints: jest.fn(),
  reset: jest.fn(),
  ...overrides,
});

const makeUseCase = (
  overrides: Partial<jest.Mocked<LeaderboardRepository>> = {},
) => {
  const leaderboardRepository = makeLeaderboardRepository(overrides);
  const useCase = new GetLeaderboardUseCase(leaderboardRepository);
  return { useCase, leaderboardRepository };
};

describe('GetLeaderboardUseCase', () => {
  describe('execute', () => {
    it('should default to the current month when none is provided', async () => {
      const { useCase, leaderboardRepository } = makeUseCase();

      const result = await useCase.execute();

      const currentMonth = getCurrentYearMonth();
      expect(leaderboardRepository.getMonthly).toHaveBeenCalledWith(
        currentMonth,
      );
      expect(result.month).toBe(currentMonth);
    });

    it('should use the requested month when provided', async () => {
      const month: YearMonth = '2025-12';
      const { useCase, leaderboardRepository } = makeUseCase();

      const result = await useCase.execute({ month });

      expect(leaderboardRepository.getMonthly).toHaveBeenCalledWith(month);
      expect(result.month).toBe(month);
    });

    it('should return null userRank when no userId is provided', async () => {
      const { useCase, leaderboardRepository } = makeUseCase();

      const result = await useCase.execute();

      expect(leaderboardRepository.getUserRankInfo).not.toHaveBeenCalled();
      expect(result.userRank).toBeNull();
    });

    it('should fetch userRank when userId is provided', async () => {
      const { useCase, leaderboardRepository } = makeUseCase();

      const result = await useCase.execute({ userId: 'user-1' });

      expect(leaderboardRepository.getUserRankInfo).toHaveBeenCalledWith(
        'user-1',
        getCurrentYearMonth(),
      );
      expect(result.userRank).toEqual({
        rank: 5,
        percentile: '5%',
        monthlyPoints: 50,
      });
    });

    it('should return the monthly entries from the repository', async () => {
      const { useCase } = makeUseCase();

      const result = await useCase.execute();

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].rank).toBe(1);
    });
  });
});
