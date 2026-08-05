import { CoordinatesVO } from '../../src/domain/value-objects/Coordinates.vo';
import { DrizzleParkingRepository } from '../../src/infrastructure/orm/repositories/DrizzleParking.repository';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

// Reims city center, matching ParkingBuilder's defaults.
const REIMS_CENTER = { lat: 49.2583, lng: 4.0317 };
// ~90km away — well outside any reasonable search radius.
const FAR_AWAY = { lat: 48.8566, lng: 2.3522 };

describe('DrizzleParkingRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleParkingRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleParkingRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  describe('findById', () => {
    it('returns the parking with its owner', async () => {
      const owner = await factory.user().withUsername('owner').create();
      const created = await factory
        .parking()
        .withName('Parking Cathédrale')
        .addedBy(owner.id)
        .create();

      const parking = await repository.findById(created.id);

      expect(parking).not.toBeNull();
      expect(parking?.name).toBe('Parking Cathédrale');
      expect(parking?.addedBy.id).toBe(owner.id);
    });

    it('returns null when the parking does not exist', async () => {
      const parking = await repository.findById('missing-id');

      expect(parking).toBeNull();
    });
  });

  describe('findNearBy', () => {
    it('returns only parkings within the search radius', async () => {
      const nearby = await factory
        .parking()
        .withCoordinates(REIMS_CENTER.lat, REIMS_CENTER.lng)
        .create();
      await factory
        .parking()
        .withCoordinates(FAR_AWAY.lat, FAR_AWAY.lng)
        .create();

      const results = await repository.findNearBy(
        CoordinatesVO.create(REIMS_CENTER.lat, REIMS_CENTER.lng),
        { radius: 5000 },
      );

      expect(results.map((parking) => parking.id)).toEqual([nearby.id]);
    });
  });

  describe('deleteById', () => {
    it('removes the parking', async () => {
      const created = await factory.parking().create();

      await repository.deleteById(created.id);

      const parking = await repository.findById(created.id);
      expect(parking).toBeNull();
    });
  });
});
