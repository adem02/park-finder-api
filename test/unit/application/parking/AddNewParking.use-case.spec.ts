import { AddNewParkingUseCase } from '../../../../src/application/parking/AddNewParking.use-case';
import { AwardPointsUseCase } from '../../../../src/application/points/AwardPoints.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { User } from '../../../../src/domain/entities/User';
import { Parking } from '../../../../src/domain/entities/Parking';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import type { UserRepository } from '../../../../src/application/gateway/User.repository';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';
import type { StorageService } from '../../../../src/application/gateway/Storage.service';

const makeUser = () =>
  User.reconstitute({
    id: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeParking = () =>
  Parking.reconstitute({
    id: 'parking-1',
    name: 'Parking Centrale',
    totalSpots: 50,
    photos: ['https://example.com/photo.jpg'],
    coordinates: CoordinatesVO.reconstruct(9.537, -13.6773),
    addedBy: makeUser(),
    createdAt: new Date(),
  });

const makeParkingRepository = (
  overrides: Partial<jest.Mocked<ParkingRepository>> = {},
): jest.Mocked<ParkingRepository> => ({
  findNearBy: jest.fn().mockResolvedValue([]),
  findNearByWithDetails: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue(undefined),
  findByUserId: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
});

const makeStorageService = (
  overrides: Partial<jest.Mocked<StorageService>> = {},
): jest.Mocked<StorageService> => ({
  uploadMany: jest.fn().mockResolvedValue(['https://example.com/photo.jpg']),
  deleteMany: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeUserRepository = (
  overrides: Partial<jest.Mocked<UserRepository>> = {},
): jest.Mocked<UserRepository> => ({
  findById: jest.fn().mockResolvedValue(makeUser()),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  updatePointsById: jest.fn(),
  findStatsByUserId: jest.fn(),
  ...overrides,
});

const makeUseCase = (
  overrides: {
    parkingRepository?: Partial<jest.Mocked<ParkingRepository>>;
    storageService?: Partial<jest.Mocked<StorageService>>;
    userRepository?: Partial<jest.Mocked<UserRepository>>;
  } = {},
) => {
  const parkingRepository = makeParkingRepository(overrides.parkingRepository);
  const storageService = makeStorageService(overrides.storageService);
  const userRepository = makeUserRepository(overrides.userRepository);
  const awardPointsUseCase = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AwardPointsUseCase>;

  const useCase = new AddNewParkingUseCase(
    parkingRepository,
    storageService,
    userRepository,
    awardPointsUseCase,
  );

  return {
    useCase,
    parkingRepository,
    storageService,
    userRepository,
    awardPointsUseCase,
  };
};

const validRequest = {
  userId: 'user-1',
  name: 'Parking Centrale',
  totalSpots: 50,
  photos: [],
  coordinates: { latitude: 9.537, longitude: -13.6773 },
};

describe('AddNewParkingUseCase', () => {
  describe('execute', () => {
    it('should upload photos, create a parking and return its id', async () => {
      const { useCase, parkingRepository, storageService } = makeUseCase();

      const result = await useCase.execute(validRequest);

      expect(storageService.uploadMany).toHaveBeenCalledWith(
        validRequest.photos,
      );
      expect(parkingRepository.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBeDefined();
    });

    it('should check for nearby parkings with radius 50m and limit 1', async () => {
      const { useCase, parkingRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(parkingRepository.findNearBy).toHaveBeenCalledWith(
        expect.any(CoordinatesVO),
        { radius: 50, limit: 1 },
      );
    });

    it('should run findNearBy and findById in parallel', async () => {
      const callOrder: string[] = [];

      const { useCase } = makeUseCase({
        parkingRepository: {
          findNearBy: jest.fn().mockImplementation(() => {
            callOrder.push('findNearBy');
            return [];
          }),
        },
        userRepository: {
          findById: jest.fn().mockImplementation(() => {
            callOrder.push('findById');
            return makeUser();
          }),
        },
      });

      await useCase.execute(validRequest);

      expect(callOrder).toContain('findNearBy');
      expect(callOrder).toContain('findById');
    });

    it('should throw ResourceNotFoundException when user is not found', async () => {
      const { useCase } = makeUseCase({
        userRepository: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should throw ResourceNotFoundException when a parking already exists nearby', async () => {
      const { useCase } = makeUseCase({
        parkingRepository: {
          findNearBy: jest.fn().mockResolvedValue([makeParking()]),
        },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should not upload photos if user is not found', async () => {
      const { useCase, storageService } = makeUseCase({
        userRepository: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow();
      expect(storageService.uploadMany).not.toHaveBeenCalled();
    });

    it('should not upload photos if a nearby parking already exists', async () => {
      const { useCase, storageService } = makeUseCase({
        parkingRepository: {
          findNearBy: jest.fn().mockResolvedValue([makeParking()]),
        },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow();
      expect(storageService.uploadMany).not.toHaveBeenCalled();
    });

    it('should delete uploaded photos and rethrow if parking creation fails', async () => {
      const uploadedUrls = ['https://example.com/photo.jpg'];
      const dbError = new Error('DB error');

      const { useCase, storageService } = makeUseCase({
        storageService: {
          uploadMany: jest.fn().mockResolvedValue(uploadedUrls),
        },
        parkingRepository: {
          create: jest.fn().mockRejectedValue(dbError),
        },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(dbError);
      expect(storageService.deleteMany).toHaveBeenCalledWith(uploadedUrls);
    });

    it('should not delete photos if parking creation succeeds', async () => {
      const { useCase, storageService } = makeUseCase();

      await useCase.execute(validRequest);

      expect(storageService.deleteMany).not.toHaveBeenCalled();
    });

    it('should award PARKING_ADDED points to the user', async () => {
      const { useCase, awardPointsUseCase } = makeUseCase();

      await useCase.execute(validRequest);

      expect(awardPointsUseCase.execute).toHaveBeenCalledWith({
        userId: validRequest.userId,
        action: 'PARKING_ADDED',
      });
    });

    it('should not award points if parking creation fails', async () => {
      const { useCase, awardPointsUseCase } = makeUseCase({
        parkingRepository: {
          create: jest.fn().mockRejectedValue(new Error('DB error')),
        },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow('DB error');
      expect(awardPointsUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
