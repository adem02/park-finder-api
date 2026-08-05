import { DrizzleVoteRepository } from '../../src/infrastructure/orm/repositories/DrizzleVote.repository';
import { VoteMapper } from '../../src/infrastructure/orm/mapper/Vote.mapper';
import { ResourceNotFoundException } from '../../src/domain/exceptions/ResourceNotFound.exception';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

describe('DrizzleVoteRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleVoteRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleVoteRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  describe('findByParkingIdAndUserId', () => {
    it('returns the vote cast by the user for the parking', async () => {
      const parking = await factory.parking().create();
      const user = await factory.user().create();
      await factory
        .vote()
        .forParking(parking.id)
        .votedBy(user.id)
        .withType('UPVOTE')
        .create();

      const vote = await repository.findByParkingIdAndUserId(
        parking.id,
        user.id,
      );

      expect(vote).not.toBeNull();
      expect(vote?.voteType).toBe('UPVOTE');
    });

    it('returns null when the user has not voted on the parking', async () => {
      const parking = await factory.parking().create();
      const user = await factory.user().create();

      const vote = await repository.findByParkingIdAndUserId(
        parking.id,
        user.id,
      );

      expect(vote).toBeNull();
    });
  });

  describe('findByParkingId', () => {
    it('returns every vote cast on the parking', async () => {
      const parking = await factory.parking().create();
      await factory.vote().forParking(parking.id).withType('UPVOTE').create();
      await factory.vote().forParking(parking.id).withType('DOWNVOTE').create();

      const votes = await repository.findByParkingId(parking.id);

      expect(votes).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('changes the vote type', async () => {
      const parking = await factory.parking().create();
      const user = await factory.user().create();
      const row = await factory
        .vote()
        .forParking(parking.id)
        .votedBy(user.id)
        .withType('UPVOTE')
        .create();

      const changed = VoteMapper.toDomain({ ...row, updatedAt: null }).change(
        'DOWNVOTE',
      );
      await repository.update(changed);

      const updated = await repository.findByParkingIdAndUserId(
        parking.id,
        user.id,
      );
      expect(updated?.voteType).toBe('DOWNVOTE');
    });
  });

  describe('cancelByParkingIdAndUserId', () => {
    it('removes the vote', async () => {
      const parking = await factory.parking().create();
      const user = await factory.user().create();
      await factory.vote().forParking(parking.id).votedBy(user.id).create();

      await repository.cancelByParkingIdAndUserId(parking.id, user.id);

      const vote = await repository.findByParkingIdAndUserId(
        parking.id,
        user.id,
      );
      expect(vote).toBeNull();
    });

    it('throws when there is no vote to cancel', async () => {
      const parking = await factory.parking().create();
      const user = await factory.user().create();

      await expect(
        repository.cancelByParkingIdAndUserId(parking.id, user.id),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
