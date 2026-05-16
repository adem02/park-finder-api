import { FindNearbyParkingsUseCase } from '../../../../src/application/parking/FindNearbyParkings.use-case';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { NearbyParkLimitByRadius } from '../../../../src/domain/constants/parking.constants';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';
import type { ParkingRadius } from '../../../../src/domain/types/parking.types';

const makeUser = () =>
  User.reconstitute({
    id: 'user-1',
    username: 'johndoe',
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeParking = (id = 'parking-1') =>
  Parking.reconstitute({
    id,
    name: 'Parking Centrale',
    totalSpots: 50,
    photos: [],
    coordinates: CoordinatesVO.reconstruct(9.537, -13.6773),
    addedBy: makeUser(),
    createdAt: new Date(),
  });

const makeParkingRepository = (
  overrides: Partial<jest.Mocked<ParkingRepository>> = {},
): jest.Mocked<ParkingRepository> => ({
  findNearBy: jest.fn().mockResolvedValue([]),
  findById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  findByUserId: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
});

const makeUseCase = (
  overrides: Partial<jest.Mocked<ParkingRepository>> = {},
) => {
  const parkingRepository = makeParkingRepository(overrides);
  const useCase = new FindNearbyParkingsUseCase(parkingRepository);
  return { useCase, parkingRepository };
};

const validRequest = {
  radius: 1000 as ParkingRadius,
  coordinates: { latitude: 9.537, longitude: -13.6773 },
};

describe('FindNearbyParkingsUseCase', () => {
  describe('execute', () => {
    it('should return nearby parkings', async () => {
      const parkings = [makeParking('p-1'), makeParking('p-2')];
      const { useCase } = makeUseCase({
        findNearBy: jest.fn().mockResolvedValue(parkings),
      });

      const result = await useCase.execute(validRequest);

      expect(result.parkings).toBe(parkings);
    });

    it('should return an empty array when no parkings are nearby', async () => {
      const { useCase } = makeUseCase({
        findNearBy: jest.fn().mockResolvedValue([]),
      });

      const result = await useCase.execute(validRequest);

      expect(result.parkings).toEqual([]);
    });

    it('should call findNearBy with the correct coordinates', async () => {
      const { useCase, parkingRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(parkingRepository.findNearBy).toHaveBeenCalledWith(
        expect.any(CoordinatesVO),
        expect.objectContaining({ radius: validRequest.radius }),
      );
    });

    it.each([500, 1000, 2000, 5000, 10000] as ParkingRadius[])(
      'should call findNearBy with limit=%s for radius=%s',
      async (radius) => {
        const { useCase, parkingRepository } = makeUseCase();

        await useCase.execute({ ...validRequest, radius });

        expect(parkingRepository.findNearBy).toHaveBeenCalledWith(
          expect.any(CoordinatesVO),
          { radius, limit: NearbyParkLimitByRadius(radius) },
        );
      },
    );
  });
});
