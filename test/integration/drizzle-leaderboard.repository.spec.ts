import { DrizzleLeaderboardRepository } from '../../src/infrastructure/orm/repositories/DrizzleLeaderboard.repository';
import { getCurrentYearMonth } from '../../src/domain/types/leaderboard.types';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

describe('DrizzleLeaderboardRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleLeaderboardRepository;
  const month = getCurrentYearMonth();

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleLeaderboardRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  describe('addPoints + getMonthly', () => {
    it('accumulates points and ranks users by monthly points', async () => {
      const alice = await factory.user().withUsername('alice').create();
      const bob = await factory.user().withUsername('bob').create();

      await repository.addPoints(alice.id, 30, month);
      await repository.addPoints(alice.id, 20, month);
      await repository.addPoints(bob.id, 10, month);

      const entries = await repository.getMonthly(month);

      expect(entries).toHaveLength(2);
      expect(entries[0].user.username).toBe('alice');
      expect(entries[0].monthlyPoints).toBe(50);
      expect(entries[0].rank).toBe(1);
      expect(entries[1].user.username).toBe('bob');
      expect(entries[1].monthlyPoints).toBe(10);
      expect(entries[1].rank).toBe(2);
    });
  });

  describe('getUserRankInfo', () => {
    it('returns rank, percentile and points for a ranked user', async () => {
      const alice = await factory.user().withUsername('alice').create();
      const bob = await factory.user().withUsername('bob').create();
      await repository.addPoints(alice.id, 100, month);
      await repository.addPoints(bob.id, 50, month);

      const info = await repository.getUserRankInfo(bob.id, month);

      expect(info).toEqual({
        rank: 2,
        percentile: '100%',
        monthlyPoints: 50,
      });
    });

    it('returns null when the user has no entry for the month', async () => {
      const user = await factory.user().create();

      const info = await repository.getUserRankInfo(user.id, month);

      expect(info).toBeNull();
    });
  });

  describe('reset', () => {
    it('removes every entry for the month', async () => {
      const user = await factory.user().create();
      await factory
        .monthlyLeaderboard()
        .forUser(user.id)
        .withMonth(month)
        .create();

      await repository.reset(month);

      const entries = await repository.getMonthly(month);
      expect(entries).toEqual([]);
    });
  });
});
