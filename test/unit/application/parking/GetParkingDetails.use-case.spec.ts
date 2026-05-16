import { GetParkingDetailsUseCase } from '../../../../src/application/parking/GetParkingDetails.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';

const makeUser = () =>
  User.reconstitute({
    id: 'user-1',
    username: 'johndoe',
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
  findById: jest.fn().mockResolvedValue(makeParking()),
  findNearBy: jest.fn(),
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
  const useCase = new GetParkingDetailsUseCase(parkingRepository);
  return { useCase, parkingRepository };
};

describe('GetParkingDetailsUseCase', () => {
  describe('execute', () => {
    it('should return the parking when found', async () => {
      const parking = makeParking();
      const { useCase } = makeUseCase({
        findById: jest.fn().mockResolvedValue(parking),
      });

      const result = await useCase.execute({ id: 'parking-1' });

      expect(result.parking).toBe(parking);
    });

    it('should call findById with the provided id', async () => {
      const { useCase, parkingRepository } = makeUseCase();

      await useCase.execute({ id: 'parking-1' });

      expect(parkingRepository.findById).toHaveBeenCalledWith('parking-1');
    });

    it('should throw ResourceNotFoundException when parking is not found', async () => {
      const { useCase } = makeUseCase({
        findById: jest.fn().mockResolvedValue(null),
      });

      await expect(useCase.execute({ id: 'unknown-id' })).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should include the parking id in the error message', async () => {
      const { useCase } = makeUseCase({
        findById: jest.fn().mockResolvedValue(null),
      });

      await expect(useCase.execute({ id: 'unknown-id' })).rejects.toThrow(
        'unknown-id',
      );
    });
  });
});
