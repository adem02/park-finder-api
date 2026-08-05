import { DrizzleCredentialsRepository } from '../../src/infrastructure/orm/repositories/DrizzleCredentials.repository';
import { UserCredentials } from '../../src/domain/entities/UserCredentials';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

describe('DrizzleCredentialsRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleCredentialsRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleCredentialsRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  describe('create + findByUserId', () => {
    it('persists local credentials retrievable by user id', async () => {
      const user = await factory.user().create();
      const credentials = UserCredentials.create({
        id: 'creds-1',
        userId: user.id,
        provider: 'local',
        passwordHash: 'hashed-password',
      });

      await repository.create(credentials);

      const found = await repository.findByUserId(user.id);
      expect(found).not.toBeNull();
      expect(found?.provider).toBe('local');
      expect(found?.passwordHash).toBe('hashed-password');
    });

    it('returns null when the user has no credentials', async () => {
      const user = await factory.user().create();

      const found = await repository.findByUserId(user.id);

      expect(found).toBeNull();
    });
  });

  describe('findByProviderId', () => {
    it('returns the credentials matching provider + providerId', async () => {
      const user = await factory.user().create();
      await factory
        .credentials()
        .forUser(user.id)
        .withProvider('google')
        .withProviderId('google-123')
        .create();

      const found = await repository.findByProviderId('google', 'google-123');

      expect(found).not.toBeNull();
      expect(found?.userId).toBe(user.id);
    });

    it('returns null when no credentials match', async () => {
      const found = await repository.findByProviderId('google', 'unknown');

      expect(found).toBeNull();
    });
  });

  describe('findLocalByUserId', () => {
    it('returns the credentials when the user has local credentials', async () => {
      const user = await factory.user().create();
      await factory
        .credentials()
        .forUser(user.id)
        .withProvider('local')
        .withPasswordHash('local-hash')
        .create();

      const found = await repository.findLocalByUserId(user.id);

      expect(found).not.toBeNull();
      expect(found?.provider).toBe('local');
    });

    it('returns null when the user only has an OAuth provider', async () => {
      const user = await factory.user().create();
      await factory
        .credentials()
        .forUser(user.id)
        .withProvider('google')
        .withProviderId('google-789')
        .create();

      const found = await repository.findLocalByUserId(user.id);

      expect(found).toBeNull();
    });
  });
});
