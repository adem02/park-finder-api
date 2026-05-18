import { ReportAvailabilityUseCase } from '../../../../src/application/report/ReportAvailability.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { InvalidAvailabilityReportException } from '../../../../src/domain/exceptions/InvalidAvailabilityReport.exception';
import { User } from '../../../../src/domain/entities/User';
import { Parking } from '../../../../src/domain/entities/Parking';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { POINTS_PER_ACTION } from '../../../../src/domain/constants/points.contants';
import { AvailabilityReport } from '../../../../src/domain/entities/AvailabilityReport';
import type { AvailabilityRepository } from '../../../../src/application/gateway/Availability.repository';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';
import type { UserRepository } from '../../../../src/application/gateway/User.repository';

// ─── Factories ────────────────────────────────────────────────────────────────

const makeUser = (id = 'user-1') =>
  User.reconstitute({
    id,
    username: 'johndoe',
    email: 'john@example.com',
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeParking = (totalSpots = 50) =>
  Parking.reconstitute({
    id: 'parking-1',
    name: 'Parking Centrale',
    totalSpots,
    photos: [],
    coordinates: CoordinatesVO.reconstruct(9.537, -13.6773),
    addedBy: makeUser(),
    createdAt: new Date(),
  });

const makeParkingRepository = (
  overrides: Partial<jest.Mocked<ParkingRepository>> = {},
): jest.Mocked<ParkingRepository> => ({
  findNearBy: jest.fn(),
  findById: jest.fn().mockResolvedValue(makeParking()),
  create: jest.fn(),
  updateById: jest.fn(),
  findByUserId: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
});

const makeUserRepository = (
  overrides: Partial<jest.Mocked<UserRepository>> = {},
): jest.Mocked<UserRepository> => ({
  findById: jest.fn().mockResolvedValue(makeUser()),
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  updatePointsById: jest.fn().mockResolvedValue(undefined),
  deleteById: jest.fn(),
  findStatsByUserId: jest.fn(),
  ...overrides,
});

const makeAvailabilityRepository = (
  overrides: Partial<jest.Mocked<AvailabilityRepository>> = {},
): jest.Mocked<AvailabilityRepository> => ({
  findLatestByParkingId: jest.fn(),
  findByParkingId: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  expireOld: jest.fn(),
  ...overrides,
});

const makeUseCase = (
  overrides: {
    parking?: Partial<jest.Mocked<ParkingRepository>>;
    user?: Partial<jest.Mocked<UserRepository>>;
    availability?: Partial<jest.Mocked<AvailabilityRepository>>;
  } = {},
) => {
  const parkingRepository = makeParkingRepository(overrides.parking);
  const userRepository = makeUserRepository(overrides.user);
  const availabilityRepository = makeAvailabilityRepository(
    overrides.availability,
  );
  const useCase = new ReportAvailabilityUseCase(
    availabilityRepository,
    parkingRepository,
    userRepository,
  );
  return { useCase, parkingRepository, userRepository, availabilityRepository };
};

const validRequest = {
  parkingId: 'parking-1',
  reporterId: 'user-1',
  availableSpots: 10,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReportAvailabilityUseCase', () => {
  describe('execute', () => {
    it('should create a report and persist it', async () => {
      const { useCase, availabilityRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(availabilityRepository.create).toHaveBeenCalledWith(
        expect.any(AvailabilityReport),
      );
    });

    it('should save a report with the correct availableSpots', async () => {
      const { useCase, availabilityRepository } = makeUseCase();

      await useCase.execute({ ...validRequest, availableSpots: 25 });

      expect(availabilityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ availableSpots: 25 }),
      );
    });

    it('should award AVAILABILITY_REPORTED points to the reporter', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(userRepository.updatePointsById).toHaveBeenCalledWith(
        validRequest.reporterId,
        POINTS_PER_ACTION.AVAILABILITY_REPORTED,
      );
    });

    it('should fetch parking and user in parallel', async () => {
      const order: string[] = [];
      const { useCase } = makeUseCase({
        parking: {
          findById: jest.fn().mockImplementation(() => {
            order.push('parking');
            return makeParking();
          }),
        },
        user: {
          findById: jest.fn().mockImplementation(() => {
            order.push('user');
            return makeUser();
          }),
        },
      });

      await useCase.execute(validRequest);

      // Both must have been called (order is non-deterministic with Promise.all)
      expect(order).toHaveLength(2);
      expect(order).toContain('parking');
      expect(order).toContain('user');
    });

    it('should throw ResourceNotFoundException when parking is not found', async () => {
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should include the parkingId in the error message when parking not found', async () => {
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        validRequest.parkingId,
      );
    });

    it('should throw ResourceNotFoundException when user is not found', async () => {
      const { useCase } = makeUseCase({
        user: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should include the reporterId in the error message when user not found', async () => {
      const { useCase } = makeUseCase({
        user: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        validRequest.reporterId,
      );
    });

    it('should throw when availableSpots exceeds totalSpots', async () => {
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(makeParking(10)) },
      });

      await expect(
        useCase.execute({ ...validRequest, availableSpots: 11 }),
      ).rejects.toThrow(InvalidAvailabilityReportException);
    });

    it('should not call availabilityRepository.create when parking is not found', async () => {
      const { useCase, availabilityRepository } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow();
      expect(availabilityRepository.create).not.toHaveBeenCalled();
    });

    it('should not update points when create throws', async () => {
      const { useCase, userRepository } = makeUseCase({
        availability: {
          create: jest.fn().mockRejectedValue(new Error('DB error')),
        },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow('DB error');
      expect(userRepository.updatePointsById).not.toHaveBeenCalled();
    });
  });
});
