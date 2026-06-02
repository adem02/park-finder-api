import { FindNearbyParkingsUseCase } from '../../../../src/application/parking/FindNearbyParkings.use-case';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { ParkingScoreVO } from '../../../../src/domain/value-objects/ParkingScore.vo';
import { AvailabilityReport } from '../../../../src/domain/entities/AvailabilityReport';
import { NearbyParkLimitByRadius } from '../../../../src/domain/constants/parking.constants';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';
import type {
  NearbyParkingItem,
  ParkingRadius,
} from '../../../../src/domain/types/parking.types';

const makeUser = () =>
  User.reconstitute({
    id: 'user-1',
    username: 'johndoe',
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeParking = (
  id = 'parking-1',
  overrides: Partial<{
    totalSpots: number;
    createdAt: Date;
  }> = {},
) =>
  Parking.reconstitute({
    id,
    name: 'Parking Centrale',
    totalSpots: overrides.totalSpots ?? 50,
    photos: [],
    coordinates: CoordinatesVO.reconstruct(9.537, -13.6773),
    addedBy: makeUser(),
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
  });

const makeReport = (
  parking: Parking,
  availableSpots: number,
  reportedAt: Date = new Date(),
) =>
  AvailabilityReport.reconstitute({
    id: `report-${parking.id}`,
    parking,
    reportedBy: makeUser(),
    availableSpots,
    reportedAt,
  });

const makeItem = (
  parking: Parking,
  overrides: Partial<NearbyParkingItem> = {},
): NearbyParkingItem => ({
  parking,
  score: ParkingScoreVO.create(0, 0),
  latestReport: null,
  distanceMeters: 100,
  ...overrides,
});

const makeParkingRepository = (
  overrides: Partial<jest.Mocked<ParkingRepository>> = {},
): jest.Mocked<ParkingRepository> => ({
  findNearBy: jest.fn().mockResolvedValue([]),
  findNearByWithDetails: jest.fn().mockResolvedValue([]),
  findById: jest.fn(),
  create: jest.fn(),
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
    it('should return nearby items', async () => {
      const items = [
        makeItem(makeParking('p-1'), { distanceMeters: 50 }),
        makeItem(makeParking('p-2'), { distanceMeters: 200 }),
      ];
      const { useCase } = makeUseCase({
        findNearByWithDetails: jest.fn().mockResolvedValue(items),
      });

      const result = await useCase.execute(validRequest);

      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.parking.id)).toEqual(['p-1', 'p-2']);
    });

    it('should return an empty array when no parkings are nearby', async () => {
      const { useCase } = makeUseCase();
      const result = await useCase.execute(validRequest);
      expect(result.items).toEqual([]);
    });

    it.each([500, 1000, 2000, 5000, 10000] as ParkingRadius[])(
      'should call findNearByWithDetails with limit=%s for radius=%s',
      async (radius) => {
        const { useCase, parkingRepository } = makeUseCase();

        await useCase.execute({ ...validRequest, radius });

        expect(parkingRepository.findNearByWithDetails).toHaveBeenCalledWith(
          expect.any(CoordinatesVO),
          { radius, limit: NearbyParkLimitByRadius(radius) },
        );
      },
    );

    it('should filter by minSpots', async () => {
      const items = [
        makeItem(makeParking('p-small', { totalSpots: 3 })),
        makeItem(makeParking('p-big', { totalSpots: 20 })),
      ];
      const { useCase } = makeUseCase({
        findNearByWithDetails: jest.fn().mockResolvedValue(items),
      });

      const result = await useCase.execute({ ...validRequest, minSpots: 10 });

      expect(result.items.map((i) => i.parking.id)).toEqual(['p-big']);
    });

    it('should filter by availableOnly using non-expired report with spots > 0', async () => {
      const pA = makeParking('p-a');
      const pB = makeParking('p-b');
      const pC = makeParking('p-c');
      const items = [
        makeItem(pA, { latestReport: makeReport(pA, 5) }),
        makeItem(pB, { latestReport: makeReport(pB, 0) }),
        makeItem(pC, { latestReport: null }),
      ];
      const { useCase } = makeUseCase({
        findNearByWithDetails: jest.fn().mockResolvedValue(items),
      });

      const result = await useCase.execute({
        ...validRequest,
        availableOnly: true,
      });

      expect(result.items.map((i) => i.parking.id)).toEqual(['p-a']);
    });

    it('should filter by verifiedOnly using score', async () => {
      const items = [
        makeItem(makeParking('p-low'), {
          score: ParkingScoreVO.create(2, 0),
        }),
        makeItem(makeParking('p-high'), {
          score: ParkingScoreVO.create(20, 1),
        }),
      ];
      const { useCase } = makeUseCase({
        findNearByWithDetails: jest.fn().mockResolvedValue(items),
      });

      const result = await useCase.execute({
        ...validRequest,
        verifiedOnly: true,
      });

      expect(result.items.map((i) => i.parking.id)).toEqual(['p-high']);
    });

    it('should sort by distance ascending by default', async () => {
      const items = [
        makeItem(makeParking('far'), { distanceMeters: 800 }),
        makeItem(makeParking('near'), { distanceMeters: 50 }),
      ];
      const { useCase } = makeUseCase({
        findNearByWithDetails: jest.fn().mockResolvedValue(items),
      });

      const result = await useCase.execute(validRequest);

      expect(result.items.map((i) => i.parking.id)).toEqual(['near', 'far']);
    });

    it('should sort by recent (createdAt desc)', async () => {
      const items = [
        makeItem(makeParking('old', { createdAt: new Date('2025-01-01') })),
        makeItem(makeParking('new', { createdAt: new Date('2026-03-01') })),
      ];
      const { useCase } = makeUseCase({
        findNearByWithDetails: jest.fn().mockResolvedValue(items),
      });

      const result = await useCase.execute({ ...validRequest, sort: 'recent' });

      expect(result.items.map((i) => i.parking.id)).toEqual(['new', 'old']);
    });

    it('should sort by popularity (netScore desc)', async () => {
      const items = [
        makeItem(makeParking('low'), {
          score: ParkingScoreVO.create(1, 0),
        }),
        makeItem(makeParking('high'), {
          score: ParkingScoreVO.create(15, 2),
        }),
      ];
      const { useCase } = makeUseCase({
        findNearByWithDetails: jest.fn().mockResolvedValue(items),
      });

      const result = await useCase.execute({
        ...validRequest,
        sort: 'popularity',
      });

      expect(result.items.map((i) => i.parking.id)).toEqual(['high', 'low']);
    });
  });
});
