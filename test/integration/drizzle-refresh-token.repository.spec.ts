import { eq } from 'drizzle-orm';
import { users } from '../../src/infrastructure/orm/drizzle/schema';
import { DrizzleRefreshTokenRepository } from '../../src/infrastructure/orm/repositories/DrizzleRefreshToken.repository';
import { RefreshToken } from '../../src/domain/entities/RefreshToken';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

const NOW = new Date('2026-11-21T12:00:00.000Z');

const tokenFor = (
  userId: string,
  overrides: { id?: string; familyId?: string; hash?: string; now?: Date } = {},
) =>
  RefreshToken.issue({
    id: overrides.id ?? 'rt-1',
    userId,
    familyId: overrides.familyId ?? 'family-1',
    tokenHash: overrides.hash ?? 'hash-1',
    now: overrides.now ?? NOW,
  });

describe('DrizzleRefreshTokenRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleRefreshTokenRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleRefreshTokenRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  it('persists a token retrievable by its hash', async () => {
    const user = await factory.user().create();
    await repository.create(tokenFor(user.id));

    const found = await repository.findByHash('hash-1');

    expect(found).not.toBeNull();
    expect(found?.userId).toBe(user.id);
    expect(found?.familyId).toBe('family-1');
    expect(found?.expiresAt).toEqual(new Date('2026-12-21T12:00:00.000Z'));
    expect(found?.isRevoked()).toBe(false);
  });

  it('returns null for an unknown hash', async () => {
    expect(await repository.findByHash('nope')).toBeNull();
  });

  it('rotates a token only once, even if asked twice', async () => {
    const user = await factory.user().create();
    await repository.create(tokenFor(user.id));

    const first = await repository.markRotated('rt-1', NOW);
    const second = await repository.markRotated('rt-1', NOW);

    expect(first).toBe(true);
    expect(second).toBe(false);
    const found = await repository.findByHash('hash-1');
    expect(found?.revokedReason).toBe('rotated');
    expect(found?.revokedAt).toEqual(NOW);
  });

  it('revokes the active tokens of a family without touching other sessions', async () => {
    const user = await factory.user().create();
    await repository.create(tokenFor(user.id, { id: 'a', hash: 'h-a' }));
    await repository.create(tokenFor(user.id, { id: 'b', hash: 'h-b' }));
    await repository.markRotated('a', new Date('2026-11-21T11:00:00.000Z'));
    await repository.create(
      tokenFor(user.id, { id: 'other', hash: 'h-other', familyId: 'family-2' }),
    );

    await repository.revokeFamily('family-1', 'reuse', NOW);

    expect((await repository.findByHash('h-a'))?.revokedReason).toBe('rotated');
    expect((await repository.findByHash('h-b'))?.revokedReason).toBe('reuse');
    expect((await repository.findByHash('h-other'))?.isRevoked()).toBe(false);
  });

  it('deletes only the expired tokens of the given user', async () => {
    const user = await factory.user().create();
    const otherUser = await factory.user().create();
    const longAgo = new Date('2026-09-01T00:00:00.000Z');
    await repository.create(
      tokenFor(user.id, { id: 'old', hash: 'h-old', now: longAgo }),
    );
    await repository.create(
      tokenFor(user.id, { id: 'fresh', hash: 'h-fresh' }),
    );
    await repository.create(
      tokenFor(otherUser.id, {
        id: 'other-old',
        hash: 'h-other-old',
        now: longAgo,
      }),
    );

    await repository.deleteExpiredByUserId(user.id, NOW);

    expect(await repository.findByHash('h-old')).toBeNull();
    expect(await repository.findByHash('h-fresh')).not.toBeNull();
    expect(await repository.findByHash('h-other-old')).not.toBeNull();
  });

  it('deletes the tokens with their user', async () => {
    const user = await factory.user().create();
    await repository.create(tokenFor(user.id));

    await testDb.drizzleService.db.delete(users).where(eq(users.id, user.id));

    expect(await repository.findByHash('hash-1')).toBeNull();
  });
});
