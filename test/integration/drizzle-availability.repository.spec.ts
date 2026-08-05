import { DrizzleAvailabilityRepository } from '../../src/infrastructure/orm/repositories/DrizzleAvailability.repository';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

describe('DrizzleAvailabilityRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleAvailabilityRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleAvailabilityRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  describe('findLatestByParkingId', () => {
    it('returns the most recent non-expired report', async () => {
      const parking = await factory.parking().create();
      const older = new Date(Date.now() - 10 * 60 * 1000);
      const newer = new Date(Date.now() - 1 * 60 * 1000);

      await factory
        .availabilityReport()
        .forParking(parking.id)
        .withAvailableSpots(3)
        .reportedAt(older)
        .create();
      await factory
        .availabilityReport()
        .forParking(parking.id)
        .withAvailableSpots(7)
        .reportedAt(newer)
        .create();

      const latest = await repository.findLatestByParkingId(parking.id);

      expect(latest).not.toBeNull();
      expect(latest?.availableSpots).toBe(7);
    });

    it('ignores reports already marked as expired', async () => {
      const parking = await factory.parking().create();
      await factory
        .availabilityReport()
        .forParking(parking.id)
        .withExpired(true)
        .create();

      const latest = await repository.findLatestByParkingId(parking.id);

      expect(latest).toBeNull();
    });

    it('returns null when there is no report for the parking', async () => {
      const parking = await factory.parking().create();

      const latest = await repository.findLatestByParkingId(parking.id);

      expect(latest).toBeNull();
    });
  });

  describe('findByParkingId', () => {
    it('returns every report for the parking, most recent first', async () => {
      const parking = await factory.parking().create();
      const older = new Date(Date.now() - 10 * 60 * 1000);
      const newer = new Date(Date.now() - 1 * 60 * 1000);

      await factory
        .availabilityReport()
        .forParking(parking.id)
        .reportedAt(older)
        .create();
      await factory
        .availabilityReport()
        .forParking(parking.id)
        .reportedAt(newer)
        .create();

      const reports = await repository.findByParkingId(parking.id);

      expect(reports).toHaveLength(2);
      expect(reports[0].reportedAt.getTime()).toBe(newer.getTime());
      expect(reports[1].reportedAt.getTime()).toBe(older.getTime());
    });

    it('returns an empty array when the parking has no reports', async () => {
      const parking = await factory.parking().create();

      const reports = await repository.findByParkingId(parking.id);

      expect(reports).toEqual([]);
    });
  });

  describe('expireOld', () => {
    it('excludes reports whose expiry date has passed from future lookups', async () => {
      const parking = await factory.parking().create();
      const past = new Date(Date.now() - 60 * 1000);

      await factory
        .availabilityReport()
        .forParking(parking.id)
        .expiresAt(past)
        .create();

      expect(await repository.findLatestByParkingId(parking.id)).not.toBeNull();

      await repository.expireOld();

      expect(await repository.findLatestByParkingId(parking.id)).toBeNull();
    });

    it('leaves reports that are not yet due for expiry untouched', async () => {
      const parking = await factory.parking().create();
      const future = new Date(Date.now() + 60 * 60 * 1000);

      await factory
        .availabilityReport()
        .forParking(parking.id)
        .expiresAt(future)
        .create();

      await repository.expireOld();

      expect(await repository.findLatestByParkingId(parking.id)).not.toBeNull();
    });
  });
});
