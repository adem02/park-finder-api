import { DrizzleUserRepository } from '../../src/infrastructure/orm/repositories/DrizzleUser.repository';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

describe('DrizzleUserRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleUserRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleUserRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  describe('findByUsername', () => {
    it('returns the user matching the username', async () => {
      await factory.user().withUsername('alice').create();

      const user = await repository.findByUsername('alice');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('alice');
    });

    it('returns null when no user matches', async () => {
      const user = await repository.findByUsername('unknown');

      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns the user matching the email', async () => {
      await factory.user().withEmail('bob@test.local').create();

      const user = await repository.findByEmail('bob@test.local');

      expect(user).not.toBeNull();
      expect(user?.email).toBe('bob@test.local');
    });
  });

  describe('updatePointsById', () => {
    it('increments the existing points balance', async () => {
      const created = await factory.user().withPoints(10).create();

      await repository.updatePointsById(created.id, 5);

      const updated = await repository.findById(created.id);
      expect(updated?.pointsBalance.points).toBe(15);
    });
  });

  describe('deleteById', () => {
    it('removes the user', async () => {
      const created = await factory.user().create();

      await repository.deleteById(created.id);

      const user = await repository.findById(created.id);
      expect(user).toBeNull();
    });
  });

  describe('findStatsByUserId', () => {
    it('counts parkings added, reports and votes for the user', async () => {
      const user = await factory.user().create();
      const parking = await factory.parking().addedBy(user.id).create();
      await factory
        .availabilityReport()
        .forParking(parking.id)
        .reportedBy(user.id)
        .create();
      await factory.vote().forParking(parking.id).votedBy(user.id).create();

      const stats = await repository.findStatsByUserId(user.id);

      expect(stats).toEqual({
        parkingsAdded: 1,
        reportsCount: 1,
        votesCount: 1,
      });
    });
  });
});
