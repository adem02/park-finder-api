import { eq } from 'drizzle-orm';
import { DrizzleUserRepository } from '../../src/infrastructure/orm/repositories/DrizzleUser.repository';
import {
  availabilityReports,
  comments,
  monthlyLeaderboard,
  parkings,
  refreshTokens,
  userBadges,
  userCredentials,
  users,
  votes,
} from '../../src/infrastructure/orm/drizzle/schema';
import { SYSTEM_USER } from '../../src/domain/constants/user.constants';
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

  describe('anonymize', () => {
    const MONTH = '2026-11';

    async function seedActiveUser() {
      const user = await factory
        .user()
        .withUsername('leaving')
        .withEmail('leaving@test.local')
        .withPoints(120)
        .create();
      await factory.credentials().forUser(user.id).create();
      const other = await factory.user().withUsername('staying').create();
      const ownParking = await factory.parking().addedBy(user.id).create();
      const otherParking = await factory
        .parking()
        .addedBy(other.id)
        .withCoordinates(49.26, 4.04)
        .create();
      await factory
        .comment()
        .forParking(otherParking.id)
        .writtenBy(user.id)
        .create();
      await factory
        .vote()
        .forParking(otherParking.id)
        .votedBy(user.id)
        .create();
      await factory
        .availabilityReport()
        .forParking(otherParking.id)
        .reportedBy(user.id)
        .create();
      await factory.userBadge().forUser(user.id).create();
      await factory
        .monthlyLeaderboard()
        .forUser(user.id)
        .withMonth(MONTH)
        .withMonthlyPoints(120)
        .withRank(1)
        .create();
      await factory
        .monthlyLeaderboard()
        .forUser(other.id)
        .withMonth(MONTH)
        .withMonthlyPoints(40)
        .withRank(2)
        .create();
      await testDb.drizzleService.db.insert(refreshTokens).values({
        id: 'token-1',
        userId: user.id,
        familyId: 'family-1',
        tokenHash: 'hash-1',
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      return { user, other, ownParking, otherParking };
    }

    it('strips the user of anything identifying and of points', async () => {
      const { user } = await seedActiveUser();

      await repository.anonymize(user.id, SYSTEM_USER);

      const [row] = await testDb.drizzleService.db
        .select()
        .from(users)
        .where(eq(users.id, user.id));
      expect(row.username).toMatch(/^compte-supprime-[0-9a-f]{12}$/);
      expect(row.email).toBeNull();
      expect(row.photoUrl).toBeNull();
      expect(row.points).toBe(0);
    });

    it('hands the parkings over to the system account', async () => {
      const { user, ownParking } = await seedActiveUser();

      await repository.anonymize(user.id, SYSTEM_USER);

      const [parking] = await testDb.drizzleService.db
        .select()
        .from(parkings)
        .where(eq(parkings.id, ownParking.id));
      expect(parking.addedById).toBe(SYSTEM_USER.id);
      const [system] = await testDb.drizzleService.db
        .select()
        .from(users)
        .where(eq(users.id, SYSTEM_USER.id));
      expect(system.username).toBe(SYSTEM_USER.username);
    });

    it('deletes comments, badges, credentials and sessions', async () => {
      const { user } = await seedActiveUser();

      await repository.anonymize(user.id, SYSTEM_USER);

      const { db } = testDb.drizzleService;
      expect(
        await db.select().from(comments).where(eq(comments.authorId, user.id)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(userBadges)
          .where(eq(userBadges.userId, user.id)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(userCredentials)
          .where(eq(userCredentials.userId, user.id)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(refreshTokens)
          .where(eq(refreshTokens.userId, user.id)),
      ).toHaveLength(0);
    });

    it('keeps votes and availability reports so other parkings keep their score', async () => {
      const { user } = await seedActiveUser();

      await repository.anonymize(user.id, SYSTEM_USER);

      const { db } = testDb.drizzleService;
      expect(
        await db.select().from(votes).where(eq(votes.votedById, user.id)),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(availabilityReports)
          .where(eq(availabilityReports.reportedById, user.id)),
      ).toHaveLength(1);
    });

    it('leaves the leaderboard and moves the others up', async () => {
      const { user, other } = await seedActiveUser();

      await repository.anonymize(user.id, SYSTEM_USER);

      const entries = await testDb.drizzleService.db
        .select()
        .from(monthlyLeaderboard)
        .where(eq(monthlyLeaderboard.month, MONTH));
      expect(entries).toHaveLength(1);
      expect(entries[0].userId).toBe(other.id);
      expect(entries[0].rank).toBe(1);
    });
  });

  describe('withdrawPointsById', () => {
    it('takes points back, never below zero', async () => {
      const rich = await factory
        .user()
        .withUsername('rich')
        .withPoints(50)
        .create();
      const poor = await factory
        .user()
        .withUsername('poor')
        .withPoints(5)
        .create();

      await repository.withdrawPointsById(rich.id, 20);
      await repository.withdrawPointsById(poor.id, 20);

      expect((await repository.findById(rich.id))?.pointsBalance.points).toBe(
        30,
      );
      expect((await repository.findById(poor.id))?.pointsBalance.points).toBe(
        0,
      );
    });
  });
});
