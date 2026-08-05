import { DrizzleBadgeRepository } from '../../src/infrastructure/orm/repositories/DrizzleBadge.repository';
import { BadgeMapper } from '../../src/infrastructure/orm/mapper/Badge.mapper';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

describe('DrizzleBadgeRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleBadgeRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleBadgeRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  describe('findAll', () => {
    it('returns every badge', async () => {
      await factory.badge().withName('first-parking').create();
      await factory.badge().withName('ten-parkings').create();

      const badges = await repository.findAll();

      expect(badges.map((badge) => badge.name).sort()).toEqual([
        'first-parking',
        'ten-parkings',
      ]);
    });
  });

  describe('findByUserId', () => {
    it('returns only the badges earned by the user', async () => {
      const user = await factory.user().create();
      const earnedBadge = await factory.badge().withName('earned').create();
      await factory.badge().withName('not-earned').create();
      await factory
        .userBadge()
        .forUser(user.id)
        .forBadge(earnedBadge.id)
        .create();

      const badges = await repository.findByUserId(user.id);

      expect(badges).toHaveLength(1);
      expect(badges[0].name).toBe('earned');
    });

    it('returns an empty array when the user has no badges', async () => {
      const user = await factory.user().create();

      const badges = await repository.findByUserId(user.id);

      expect(badges).toEqual([]);
    });
  });

  describe('assignToUser', () => {
    it('links the badge to the user', async () => {
      const user = await factory.user().create();
      const badgeRow = await factory.badge().withName('collector').create();
      const badge = BadgeMapper.toDomain(badgeRow);

      await repository.assignToUser(user.id, badge);

      const badges = await repository.findByUserId(user.id);
      expect(badges.map((b) => b.name)).toEqual(['collector']);
    });
  });
});
