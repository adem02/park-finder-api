import { CoordinatesVO } from '../../src/domain/value-objects/Coordinates.vo';
import { DrizzleParkingRepository } from '../../src/infrastructure/orm/repositories/DrizzleParking.repository';
import { parkingPhotos } from '../../src/infrastructure/orm/drizzle/schema';
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

  describe('hasContributionsFromOthers', () => {
    it('is false when only the author voted, commented or reported', async () => {
      const author = await factory.user().create();
      const parking = await factory.parking().addedBy(author.id).create();
      await factory.vote().forParking(parking.id).votedBy(author.id).create();
      await factory
        .comment()
        .forParking(parking.id)
        .writtenBy(author.id)
        .create();
      await factory
        .availabilityReport()
        .forParking(parking.id)
        .reportedBy(author.id)
        .create();

      expect(
        await repository.hasContributionsFromOthers(parking.id, author.id),
      ).toBe(false);
    });

    it('is true as soon as someone else voted', async () => {
      const author = await factory.user().create();
      const other = await factory.user().withUsername('other').create();
      const parking = await factory.parking().addedBy(author.id).create();
      await factory.vote().forParking(parking.id).votedBy(other.id).create();

      expect(
        await repository.hasContributionsFromOthers(parking.id, author.id),
      ).toBe(true);
    });

    it('is true as soon as someone else posted a photo', async () => {
      const author = await factory.user().create();
      const other = await factory.user().withUsername('other').create();
      const parking = await factory.parking().addedBy(author.id).create();
      await testDb.drizzleService.db.insert(parkingPhotos).values({
        id: 'photo-1',
        parkingId: parking.id,
        url: 'https://cdn/photo.jpg',
        addedById: other.id,
      });

      expect(
        await repository.hasContributionsFromOthers(parking.id, author.id),
      ).toBe(true);
    });

    it('is true as soon as someone else commented or reported', async () => {
      const author = await factory.user().create();
      const other = await factory.user().withUsername('other').create();
      const commented = await factory.parking().addedBy(author.id).create();
      const reported = await factory
        .parking()
        .addedBy(author.id)
        .withCoordinates(49.3, 4.1)
        .create();
      await factory
        .comment()
        .forParking(commented.id)
        .writtenBy(other.id)
        .create();
      await factory
        .availabilityReport()
        .forParking(reported.id)
        .reportedBy(other.id)
        .create();

      expect(
        await repository.hasContributionsFromOthers(commented.id, author.id),
      ).toBe(true);
      expect(
        await repository.hasContributionsFromOthers(reported.id, author.id),
      ).toBe(true);
    });
  });
});
