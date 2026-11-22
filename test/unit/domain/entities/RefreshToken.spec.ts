import { RefreshToken } from '../../../../src/domain/entities/RefreshToken';

const NOW = new Date('2026-11-21T12:00:00Z');
const seconds = (n: number) => new Date(NOW.getTime() + n * 1000);

const issued = () =>
  RefreshToken.issue({
    id: 'rt-1',
    userId: 'user-1',
    familyId: 'family-1',
    tokenHash: 'hash',
    now: NOW,
  });

const revoked = (
  reason: 'rotated' | 'logout' | 'reuse',
  revokedAt: Date = NOW,
) =>
  RefreshToken.reconstitute({
    id: 'rt-1',
    userId: 'user-1',
    familyId: 'family-1',
    tokenHash: 'hash',
    expiresAt: new Date('2026-12-21T12:00:00Z'),
    createdAt: NOW,
    revokedAt,
    revokedReason: reason,
  });

describe('RefreshToken', () => {
  it('should expire 30 days after being issued', () => {
    const token = issued();

    expect(token.expiresAt).toEqual(new Date('2026-12-21T12:00:00Z'));
    expect(token.isExpired(new Date('2026-12-21T11:59:59Z'))).toBe(false);
    expect(token.isExpired(new Date('2026-12-21T12:00:00Z'))).toBe(true);
  });

  it('should be active when issued', () => {
    expect(issued().isRevoked()).toBe(false);
  });

  it('should treat a replay within 10 s of a rotation as a race', () => {
    const token = revoked('rotated');

    expect(token.isRevoked()).toBe(true);
    expect(token.isRecentlyRotated(seconds(9))).toBe(true);
    expect(token.isRecentlyRotated(seconds(10))).toBe(false);
  });

  it('should never treat a token revoked by logout or reuse as a race', () => {
    expect(revoked('logout').isRecentlyRotated(seconds(1))).toBe(false);
    expect(revoked('reuse').isRecentlyRotated(seconds(1))).toBe(false);
  });
});
