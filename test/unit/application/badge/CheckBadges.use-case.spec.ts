import { CheckBadgesUseCase } from '../../../../src/application/badge/CheckBadges.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { Badge } from '../../../../src/domain/entities/Badge';
import { User } from '../../../../src/domain/entities/User';
import { Parking } from '../../../../src/domain/entities/Parking';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { ParkingScoreVO } from '../../../../src/domain/value-objects/ParkingScore.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import type { UserRepository } from '../../../../src/application/gateway/User.repository';
import type { BadgeRepository } from '../../../../src/application/gateway/Badge.repository';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';
import type { UserStats } from '../../../../src/domain/types/user.types';
import type { ParkingWithScore } from '../../../../src/domain/types/parking.types';

const explorerBadge = Badge.fromCatalog(
  'parkings_added',
  'badge-explorer',
  'https://cdn/explorer.png',
);

const preciseBadge = Badge.fromCatalog(
  'votes_positive_ratio',
  'badge-precise',
  'https://cdn/precise.png',
);

const makeUser = () =>
  User.create({
    id: 'user-1',
    username: 'johndoe',
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeParkingWithScore = (
  id: string,
  upvotes: number,
  downvotes: number,
  votesCount: number,
): ParkingWithScore => ({
  parking: Parking.reconstitute({
    id,
    name: `Parking ${id}`,
    totalSpots: 10,
    photos: [],
    coordinates: CoordinatesVO.create(0, 0),
    addedBy: makeUser(),
    createdAt: new Date(),
  }),
  score: ParkingScoreVO.create(upvotes, downvotes),
  votesCount,
});

const makeStats = (parkingsAdded = 0): UserStats => ({
  parkingsAdded,
  reportsCount: 0,
  votesCount: 0,
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
  findAll: jest.fn().mockResolvedValue([explorerBadge, preciseBadge]),
  findByUserId: jest.fn().mockResolvedValue([]),
  assignToUser: jest.fn().mockResolvedValue(undefined),
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
    parking?: Partial<jest.Mocked<ParkingRepository>>;
  } = {},
) => {
  const userRepository = makeUserRepository(overrides.user);
  const badgeRepository = makeBadgeRepository(overrides.badge);
  const parkingRepository = makeParkingRepository(overrides.parking);

  const useCase = new CheckBadgesUseCase(
    badgeRepository,
    userRepository,
    parkingRepository,
  );

  return { useCase, userRepository, badgeRepository, parkingRepository };
};

describe('CheckBadgesUseCase', () => {
  describe('execute', () => {
    it('should throw ResourceNotFoundException when user does not exist', async () => {
      const { useCase } = makeUseCase({
        user: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute({ userId: 'ghost' })).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should award the Explorer badge when parkingsAdded reaches the threshold', async () => {
      const { useCase, badgeRepository } = makeUseCase({
        user: { findStatsByUserId: jest.fn().mockResolvedValue(makeStats(10)) },
      });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(badgeRepository.assignToUser).toHaveBeenCalledWith(
        'user-1',
        explorerBadge,
      );
      expect(result.awardedBadges).toContain(explorerBadge);
    });

    it('should not award a badge already owned', async () => {
      const { useCase, badgeRepository } = makeUseCase({
        user: { findStatsByUserId: jest.fn().mockResolvedValue(makeStats(10)) },
        badge: { findByUserId: jest.fn().mockResolvedValue([explorerBadge]) },
      });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(badgeRepository.assignToUser).not.toHaveBeenCalledWith(
        'user-1',
        explorerBadge,
      );
      expect(result.awardedBadges).not.toContain(explorerBadge);
    });

    it('should award the Precise badge when positive vote ratio reaches threshold', async () => {
      const { useCase, badgeRepository } = makeUseCase({
        parking: {
          findByUserId: jest
            .fn()
            .mockResolvedValue([
              makeParkingWithScore('p1', 9, 1, 10),
              makeParkingWithScore('p2', 9, 0, 9),
            ]),
        },
      });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(badgeRepository.assignToUser).toHaveBeenCalledWith(
        'user-1',
        preciseBadge,
      );
      expect(result.awardedBadges).toContain(preciseBadge);
    });

    it('should not award the Precise badge when there is no vote yet', async () => {
      const { useCase, badgeRepository } = makeUseCase({
        parking: {
          findByUserId: jest
            .fn()
            .mockResolvedValue([makeParkingWithScore('p1', 0, 0, 0)]),
        },
      });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(badgeRepository.assignToUser).not.toHaveBeenCalledWith(
        'user-1',
        preciseBadge,
      );
      expect(result.awardedBadges).not.toContain(preciseBadge);
    });

    it('should return an empty list when no badge criteria is met', async () => {
      const { useCase, badgeRepository } = makeUseCase();

      const result = await useCase.execute({ userId: 'user-1' });

      expect(badgeRepository.assignToUser).not.toHaveBeenCalled();
      expect(result.awardedBadges).toEqual([]);
    });
  });
});
