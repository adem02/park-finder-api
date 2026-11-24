import { DeleteParkingUseCase } from '../../../../src/application/parking/DeleteParking.use-case';
import type {
  LeaderboardRepository,
  ParkingRepository,
  StorageService,
  UserRepository,
} from '../../../../src/application/gateway';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { NotParkingAuthorException } from '../../../../src/domain/exceptions/NotParkingAuthor.exception';
import { ParkingHasContributionsException } from '../../../../src/domain/exceptions/ParkingHasContributions.exception';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';

const PHOTOS = ['https://example.com/photo.jpg'];

const makeParking = () =>
  Parking.reconstitute({
    id: 'parking-1',
    name: 'Parking Centrale',
    totalSpots: 50,
    photos: PHOTOS,
    coordinates: CoordinatesVO.reconstruct(49.25, 4.03),
    addedBy: User.reconstitute({
      id: 'author',
      username: 'author',
      pointsBalance: PointsBalanceVO.create(20),
      createdAt: new Date(),
    }),
    createdAt: new Date('2026-10-15T10:00:00Z'),
  });

function makeUseCase(
  overrides: { parkings?: Partial<jest.Mocked<ParkingRepository>> } = {},
) {
  const parkingRepository = {
    findById: jest.fn().mockResolvedValue(makeParking()),
    hasContributionsFromOthers: jest.fn().mockResolvedValue(false),
    deleteById: jest.fn().mockResolvedValue(undefined),
    ...overrides.parkings,
  } as unknown as jest.Mocked<ParkingRepository>;
  const userRepository = {
    withdrawPointsById: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<UserRepository>;
  const leaderboardRepository = {
    withdrawPoints: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<LeaderboardRepository>;
  const storageService = {
    deleteMany: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StorageService>;

  const useCase = new DeleteParkingUseCase(
    parkingRepository,
    userRepository,
    leaderboardRepository,
    storageService,
  );
  return {
    useCase,
    parkingRepository,
    userRepository,
    leaderboardRepository,
    storageService,
  };
}

describe('DeleteParkingUseCase', () => {
  it('deletes the parking, withdraws the points of the month it was added and its photos', async () => {
    const {
      useCase,
      parkingRepository,
      userRepository,
      leaderboardRepository,
      storageService,
    } = makeUseCase();

    await useCase.execute({ parkingId: 'parking-1', userId: 'author' });

    expect(parkingRepository.deleteById).toHaveBeenCalledWith('parking-1');
    expect(userRepository.withdrawPointsById).toHaveBeenCalledWith(
      'author',
      20,
    );
    expect(leaderboardRepository.withdrawPoints).toHaveBeenCalledWith(
      'author',
      20,
      '2026-10',
    );
    expect(storageService.deleteMany).toHaveBeenCalledWith(PHOTOS);
  });

  it('refuses anyone but the author', async () => {
    const { useCase, parkingRepository } = makeUseCase();

    await expect(
      useCase.execute({ parkingId: 'parking-1', userId: 'someone-else' }),
    ).rejects.toThrow(NotParkingAuthorException);
    expect(parkingRepository.deleteById).not.toHaveBeenCalled();
  });

  it('refuses once other users have contributed', async () => {
    const { useCase, parkingRepository, userRepository } = makeUseCase({
      parkings: {
        hasContributionsFromOthers: jest.fn().mockResolvedValue(true),
      },
    });

    await expect(
      useCase.execute({ parkingId: 'parking-1', userId: 'author' }),
    ).rejects.toThrow(ParkingHasContributionsException);
    expect(parkingRepository.deleteById).not.toHaveBeenCalled();
    expect(userRepository.withdrawPointsById).not.toHaveBeenCalled();
  });

  it('throws when the parking does not exist', async () => {
    const { useCase } = makeUseCase({
      parkings: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute({ parkingId: 'ghost', userId: 'author' }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
