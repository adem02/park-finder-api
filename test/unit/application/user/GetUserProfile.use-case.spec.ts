import { GetUserProfileUseCase } from '../../../../src/application/user/GetUserProfile.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { User } from '../../../../src/domain/entities/User';
import { Parking } from '../../../../src/domain/entities/Parking';
import { Badge } from '../../../../src/domain/entities/Badge';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { ParkingScoreVO } from '../../../../src/domain/value-objects/ParkingScore.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { getCurrentYearMonth } from '../../../../src/domain/types/leaderboard.types';
import type { UserRepository } from '../../../../src/application/gateway/User.repository';
import type { BadgeRepository } from '../../../../src/application/gateway/Badge.repository';
import type { LeaderboardRepository } from '../../../../src/application/gateway/Leaderboard.repository';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';
import type { UserStats } from '../../../../src/domain/types/user.types';
import type { ParkingWithScore } from '../../../../src/domain/types/parking.types';

const makeUser = () =>
  User.create({
    id: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    pointsBalance: PointsBalanceVO.create(250),
    createdAt: new Date(),
  });

const makeStats = (): UserStats => ({
  parkingsAdded: 3,
  reportsCount: 7,
  votesCount: 12,
});

const makeRecentParking = (id: string): ParkingWithScore => ({
  parking: Parking.reconstitute({
    id,
    name: `Parking ${id}`,
    totalSpots: 5,
    photos: [],
    coordinates: CoordinatesVO.create(0, 0),
    addedBy: makeUser(),
    createdAt: new Date(),
  }),
  score: ParkingScoreVO.create(2, 0),
  votesCount: 2,
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
  updatePointsById: jest.fn(),
  findStatsByUserId: jest.fn().mockResolvedValue(makeStats()),
  ...overrides,
});

const makeBadgeRepository = (
  overrides: Partial<jest.Mocked<BadgeRepository>> = {},
): jest.Mocked<BadgeRepository> => ({
  findAll: jest.fn(),
  findByUserId: jest
    .fn()
    .mockResolvedValue([
      Badge.fromCatalog('parkings_added', 'b1', 'https://cdn/x.png'),
    ]),
  assignToUser: jest.fn(),
  ...overrides,
});

const makeLeaderboardRepository = (
  overrides: Partial<jest.Mocked<LeaderboardRepository>> = {},
): jest.Mocked<LeaderboardRepository> => ({
  getMonthly: jest.fn(),
  getUserRankInfo: jest
    .fn()
    .mockResolvedValue({ rank: 42, percentile: '5%', monthlyPoints: 120 }),
  addPoints: jest.fn(),
  reset: jest.fn(),
  ...overrides,
});

const makeParkingRepository = (
  overrides: Partial<jest.Mocked<ParkingRepository>> = {},
): jest.Mocked<ParkingRepository> => ({
  findNearBy: jest.fn(),
  findNearByWithDetails: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByUserId: jest.fn().mockResolvedValue([]),
  deleteById: jest.fn(),
  ...overrides,
});

const makeUseCase = (
  overrides: {
    user?: Partial<jest.Mocked<UserRepository>>;
    badge?: Partial<jest.Mocked<BadgeRepository>>;
    leaderboard?: Partial<jest.Mocked<LeaderboardRepository>>;
    parking?: Partial<jest.Mocked<ParkingRepository>>;
  } = {},
) => {
  const userRepository = makeUserRepository(overrides.user);
  const badgeRepository = makeBadgeRepository(overrides.badge);
  const leaderboardRepository = makeLeaderboardRepository(
    overrides.leaderboard,
  );
  const parkingRepository = makeParkingRepository(overrides.parking);

  const useCase = new GetUserProfileUseCase(
    userRepository,
    badgeRepository,
    leaderboardRepository,
    parkingRepository,
  );

  return {
    useCase,
    userRepository,
    badgeRepository,
    leaderboardRepository,
    parkingRepository,
  };
};

describe('GetUserProfileUseCase', () => {
  describe('execute', () => {
    it('should throw ResourceNotFoundException when user does not exist', async () => {
      const { useCase } = makeUseCase({
        user: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute({ userId: 'ghost' })).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should aggregate user, stats, badges, rank and recent parkings', async () => {
      const { useCase } = makeUseCase({
        parking: {
          findByUserId: jest
            .fn()
            .mockResolvedValue([
              makeRecentParking('p1'),
              makeRecentParking('p2'),
            ]),
        },
      });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(result.user.id).toBe('user-1');
      expect(result.stats.parkingsAdded).toBe(3);
      expect(result.badges).toHaveLength(1);
      expect(result.rank?.rank).toBe(42);
      expect(result.recentParkings).toHaveLength(2);
    });

    it('should request the rank for the current month', async () => {
      const { useCase, leaderboardRepository } = makeUseCase();

      await useCase.execute({ userId: 'user-1' });

      expect(leaderboardRepository.getUserRankInfo).toHaveBeenCalledWith(
        'user-1',
        getCurrentYearMonth(),
      );
    });

    it('should cap recent parkings to 5 entries', async () => {
      const tenParkings = Array.from({ length: 10 }, (_, i) =>
        makeRecentParking(`p-${i}`),
      );
      const { useCase } = makeUseCase({
        parking: { findByUserId: jest.fn().mockResolvedValue(tenParkings) },
      });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(result.recentParkings).toHaveLength(5);
    });

    it('should return rank as null when the user has no ranking yet', async () => {
      const { useCase } = makeUseCase({
        leaderboard: { getUserRankInfo: jest.fn().mockResolvedValue(null) },
      });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(result.rank).toBeNull();
    });
  });
});
