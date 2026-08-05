import { DrizzleCommentRepository } from '../../src/infrastructure/orm/repositories/DrizzleComment.repository';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

describe('DrizzleCommentRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleCommentRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleCommentRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  // Comments are created with strictly increasing `createdAt` timestamps so
  // ordering/pagination assertions below are deterministic.
  const createSequentialComments = async (parkingId: string, count: number) => {
    const base = Date.now();
    const comments = [];
    for (let i = 0; i < count; i++) {
      comments.push(
        await factory
          .comment()
          .forParking(parkingId)
          .withContent(`comment-${i}`)
          .createdAt(new Date(base + i * 1000))
          .create(),
      );
    }
    return comments;
  };

  describe('findRecentByParkingId', () => {
    it('returns the most recent comments for the parking, newest first', async () => {
      const parking = await factory.parking().create();
      await createSequentialComments(parking.id, 3);

      const comments = await repository.findRecentByParkingId(parking.id, 2);

      expect(comments.map((comment) => comment.content)).toEqual([
        'comment-2',
        'comment-1',
      ]);
    });

    it('does not return comments from other parkings', async () => {
      const parking = await factory.parking().create();
      const otherParking = await factory.parking().create();
      await factory.comment().forParking(otherParking.id).create();

      const comments = await repository.findRecentByParkingId(parking.id, 10);

      expect(comments).toEqual([]);
    });
  });

  describe('findPageByParkingId', () => {
    it('paginates comments using the cursor of the last returned item', async () => {
      const parking = await factory.parking().create();
      await createSequentialComments(parking.id, 3);

      const firstPage = await repository.findPageByParkingId(
        parking.id,
        null,
        2,
      );
      expect(firstPage.map((comment) => comment.content)).toEqual([
        'comment-2',
        'comment-1',
      ]);

      const lastOfFirstPage = firstPage[firstPage.length - 1];
      const secondPage = await repository.findPageByParkingId(
        parking.id,
        { createdAt: lastOfFirstPage.createdAt, id: lastOfFirstPage.id },
        2,
      );
      expect(secondPage.map((comment) => comment.content)).toEqual([
        'comment-0',
      ]);
    });
  });
});
