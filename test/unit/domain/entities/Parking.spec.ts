import { Parking } from '../../../../src/domain/entities/Parking';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { User } from '../../../../src/domain/entities/User';
import {
  PARKING_NAME_MIN_LENGTH,
  PARKING_NAME_MAX_LENGTH,
  PARKING_TOTAL_SPOTS_MIN,
  PARKING_TOTAL_SPOTS_MAX,
  PARKING_MAX_PHOTOS,
} from '../../../../src/domain/constants/parking.constants';
import { DUPLICATE_PARKING_RADIUS_METERS } from '../../../../src/domain/constants/coordinates.constants';
import { InvalidParkingNameLengthException } from '../../../../src/domain/exceptions/InvalidParkingNameLength.exception';
import { InvalidParkingTotalSpotsException } from '../../../../src/domain/exceptions/InvalidParkingTotalSpots.exception';
import { ParkingPhotosMaxLengthExceededException } from '../../../../src/domain/exceptions/ParkingPhotosMaxLengthExceeded.exception';

const makeUser = (): User =>
  User.create({
    id: 'user-1',
    username: 'john_doe',
    pointsBalance: PointsBalanceVO.create(10),
    createdAt: new Date('2024-01-01'),
  });

const makeCoordinates = (lat = 0, lng = 0) => CoordinatesVO.create(lat, lng);

const makeValidParams = (
  overrides: Partial<Parameters<typeof Parking.create>[0]> = {},
) => ({
  id: 'parking-1',
  name: 'Centre Ville',
  totalSpots: 50,
  photos: [],
  coordinates: makeCoordinates(),
  addedBy: makeUser(),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  ...overrides,
});

describe('Parking', () => {
  describe('create', () => {
    it('should create a parking with all provided fields', () => {
      const params = makeValidParams();
      const parking = Parking.create(params);

      expect(parking.id).toBe(params.id);
      expect(parking.name).toBe(params.name);
      expect(parking.totalSpots).toBe(params.totalSpots);
      expect(parking.photos).toEqual([]);
      expect(parking.coordinates).toBe(params.coordinates);
      expect(parking.addedBy).toBe(params.addedBy);
      expect(parking.createdAt).toBe(params.createdAt);
      expect(parking.updatedAt).toBe(params.updatedAt);
    });

    it('should create a parking without updatedAt', () => {
      const parking = Parking.create(makeValidParams({ updatedAt: undefined }));
      expect(parking.updatedAt).toBeUndefined();
    });

    it(`should accept a name of exactly ${PARKING_NAME_MIN_LENGTH} characters`, () => {
      const name = 'a'.repeat(PARKING_NAME_MIN_LENGTH);
      const parking = Parking.create(makeValidParams({ name }));
      expect(parking.name).toBe(name);
    });

    it(`should accept a name of exactly ${PARKING_NAME_MAX_LENGTH} characters`, () => {
      const name = 'a'.repeat(PARKING_NAME_MAX_LENGTH);
      const parking = Parking.create(makeValidParams({ name }));
      expect(parking.name).toBe(name);
    });

    it('should throw when name is shorter than the minimum length', () => {
      const name = 'a'.repeat(PARKING_NAME_MIN_LENGTH - 1);
      expect(() => Parking.create(makeValidParams({ name }))).toThrow(
        InvalidParkingNameLengthException,
      );
    });

    it('should throw when name is longer than the maximum length', () => {
      const name = 'a'.repeat(PARKING_NAME_MAX_LENGTH + 1);
      expect(() => Parking.create(makeValidParams({ name }))).toThrow(
        InvalidParkingNameLengthException,
      );
    });

    it(`should accept totalSpots of exactly ${PARKING_TOTAL_SPOTS_MIN}`, () => {
      const parking = Parking.create(
        makeValidParams({ totalSpots: PARKING_TOTAL_SPOTS_MIN }),
      );
      expect(parking.totalSpots).toBe(PARKING_TOTAL_SPOTS_MIN);
    });

    it(`should accept totalSpots of exactly ${PARKING_TOTAL_SPOTS_MAX}`, () => {
      const parking = Parking.create(
        makeValidParams({ totalSpots: PARKING_TOTAL_SPOTS_MAX }),
      );
      expect(parking.totalSpots).toBe(PARKING_TOTAL_SPOTS_MAX);
    });

    it('should throw when totalSpots is below the minimum', () => {
      expect(() =>
        Parking.create(
          makeValidParams({ totalSpots: PARKING_TOTAL_SPOTS_MIN - 1 }),
        ),
      ).toThrow(InvalidParkingTotalSpotsException);
    });

    it('should throw when totalSpots exceeds the maximum', () => {
      expect(() =>
        Parking.create(
          makeValidParams({ totalSpots: PARKING_TOTAL_SPOTS_MAX + 1 }),
        ),
      ).toThrow(InvalidParkingTotalSpotsException);
    });

    it('should always start with no photos', () => {
      const photos = Array.from(
        { length: PARKING_MAX_PHOTOS },
        (_, i) => `https://example.com/photo${i}.jpg`,
      );
      const parking = Parking.create(makeValidParams({ photos }));
      expect(parking.photos).toEqual([]);
    });
  });

  describe('addPhotos', () => {
    it('should return a new parking with the provided photos', () => {
      const photos = ['https://example.com/photo1.jpg'];
      const parking = Parking.create(makeValidParams()).addPhotos(photos);
      expect(parking.photos).toEqual(photos);
    });

    it(`should accept exactly ${PARKING_MAX_PHOTOS} photos`, () => {
      const photos = Array.from(
        { length: PARKING_MAX_PHOTOS },
        (_, i) => `https://example.com/photo${i}.jpg`,
      );
      const parking = Parking.create(makeValidParams()).addPhotos(photos);
      expect(parking.photos).toHaveLength(PARKING_MAX_PHOTOS);
    });

    it('should throw when photos exceed the maximum', () => {
      const photos = Array.from(
        { length: PARKING_MAX_PHOTOS + 1 },
        (_, i) => `https://example.com/photo${i}.jpg`,
      );
      expect(() => Parking.create(makeValidParams()).addPhotos(photos)).toThrow(
        ParkingPhotosMaxLengthExceededException,
      );
    });

    it('should accept an empty array', () => {
      const parking = Parking.create(makeValidParams()).addPhotos([]);
      expect(parking.photos).toEqual([]);
    });

    it('should preserve all other fields', () => {
      const params = makeValidParams();
      const parking = Parking.create(params).addPhotos([
        'https://example.com/photo.jpg',
      ]);
      expect(parking.id).toBe(params.id);
      expect(parking.name).toBe(params.name);
      expect(parking.totalSpots).toBe(params.totalSpots);
      expect(parking.coordinates).toBe(params.coordinates);
      expect(parking.addedBy).toBe(params.addedBy);
      expect(parking.createdAt).toBe(params.createdAt);
    });

    it('should return a new instance, not mutate the original', () => {
      const original = Parking.create(makeValidParams());
      const updated = original.addPhotos(['https://example.com/photo.jpg']);
      expect(original.photos).toEqual([]);
      expect(updated.photos).toHaveLength(1);
    });
  });

  describe('isNearTo', () => {
    it(`should return true when the other coordinates are within ${DUPLICATE_PARKING_RADIUS_METERS} meters`, () => {
      const parking = Parking.create(
        makeValidParams({ coordinates: makeCoordinates(0, 0) }),
      );
      const near = makeCoordinates(0.0003, 0);
      expect(parking.isNearTo(near)).toBe(true);
    });

    it(`should return false when the other coordinates are beyond ${DUPLICATE_PARKING_RADIUS_METERS} meters`, () => {
      const parking = Parking.create(
        makeValidParams({ coordinates: makeCoordinates(0, 0) }),
      );
      const far = makeCoordinates(0.001, 0);
      expect(parking.isNearTo(far)).toBe(false);
    });

    it('should return true when coordinates are identical', () => {
      const coords = makeCoordinates(9.5372, -13.6773);
      const parking = Parking.create(makeValidParams({ coordinates: coords }));
      expect(parking.isNearTo(makeCoordinates(9.5372, -13.6773))).toBe(true);
    });
  });
});
