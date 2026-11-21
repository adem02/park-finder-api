import { RefreshToken } from '../../../../../src/domain/entities/RefreshToken';
import type { RefreshTokenRepository } from '../../../../../src/application/gateway/RefreshToken.repository';
import type { OpaqueTokenService } from '../../../../../src/application/gateway/OpaqueToken.service';

export const NOW = new Date('2026-11-21T12:00:00Z');

export const storedToken = (
  overrides: Partial<Parameters<typeof RefreshToken.reconstitute>[0]> = {},
) =>
  RefreshToken.reconstitute({
    id: 'rt-1',
    userId: 'user-1',
    familyId: 'family-1',
    tokenHash: 'hash:raw-token',
    expiresAt: new Date('2026-12-01T00:00:00Z'),
    createdAt: new Date('2026-11-01T00:00:00Z'),
    revokedAt: null,
    revokedReason: null,
    ...overrides,
  });

export const makeRefreshTokenRepository = (
  overrides: Partial<jest.Mocked<RefreshTokenRepository>> = {},
): jest.Mocked<RefreshTokenRepository> => ({
  create: jest.fn(),
  findByHash: jest.fn().mockResolvedValue(storedToken()),
  markRotated: jest.fn().mockResolvedValue(true),
  revokeFamily: jest.fn(),
  deleteExpiredByUserId: jest.fn(),
  ...overrides,
});

/** Predictable fake: `hash(x)` is `hash:x`. */
export const makeOpaqueTokenService = (): jest.Mocked<OpaqueTokenService> => ({
  generate: jest.fn().mockReturnValue('new-raw-token'),
  hash: jest.fn((token: string) => `hash:${token}`),
});
