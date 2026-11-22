import { RefreshTokenUseCase } from '../../../../src/application/auth/RefreshToken.use-case';
import { InvalidRefreshTokenException } from '../../../../src/domain/exceptions/InvalidRefreshToken.exception';
import type { Logger } from '../../../../src/common/interfaces/Logger';
import type { RefreshTokenRepository } from '../../../../src/application/gateway/RefreshToken.repository';
import {
  SESSION_TOKENS,
  makeSessionIssuer,
} from './support/session-issuer.mock';
import {
  NOW,
  makeOpaqueTokenService,
  makeRefreshTokenRepository,
  storedToken,
} from './support/refresh-token.fixtures';

const makeLogger = (): jest.Mocked<Logger> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const makeUseCase = (
  repositoryOverrides: Partial<jest.Mocked<RefreshTokenRepository>> = {},
) => {
  const refreshTokens = makeRefreshTokenRepository(repositoryOverrides);
  const sessionIssuer = makeSessionIssuer();
  const logger = makeLogger();
  const useCase = new RefreshTokenUseCase(
    refreshTokens,
    makeOpaqueTokenService(),
    sessionIssuer,
    logger,
  );
  return { useCase, refreshTokens, sessionIssuer, logger };
};

const secondsAgo = (n: number) => new Date(NOW.getTime() - n * 1000);

describe('RefreshTokenUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should rotate a valid token and continue the same session', async () => {
    const { useCase, refreshTokens, sessionIssuer } = makeUseCase();

    const result = await useCase.execute({ refreshToken: 'raw-token' });

    expect(refreshTokens.findByHash).toHaveBeenCalledWith('hash:raw-token');
    expect(refreshTokens.markRotated).toHaveBeenCalledWith('rt-1', NOW);
    expect(sessionIssuer.continue).toHaveBeenCalledWith(
      'user-1',
      'family-1',
      NOW,
    );
    expect(result).toBe(SESSION_TOKENS);
  });

  it('should reject an unknown token', async () => {
    const { useCase, sessionIssuer } = makeUseCase({
      findByHash: jest.fn().mockResolvedValue(null),
    });

    await expect(useCase.execute({ refreshToken: 'forged' })).rejects.toThrow(
      InvalidRefreshTokenException,
    );
    expect(sessionIssuer.continue).not.toHaveBeenCalled();
  });

  it('should reject an expired token without rotating it', async () => {
    const { useCase, refreshTokens } = makeUseCase({
      findByHash: jest
        .fn()
        .mockResolvedValue(
          storedToken({ expiresAt: new Date('2026-11-21T11:59:59Z') }),
        ),
    });

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
    expect(refreshTokens.markRotated).not.toHaveBeenCalled();
  });

  it('should revoke the whole session when a rotated token is replayed later', async () => {
    const { useCase, refreshTokens, logger } = makeUseCase({
      findByHash: jest.fn().mockResolvedValue(
        storedToken({
          revokedAt: secondsAgo(60),
          revokedReason: 'rotated',
        }),
      ),
    });

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
    expect(refreshTokens.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      'reuse',
      NOW,
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should reject a replay right after a rotation without revoking the session', async () => {
    const { useCase, refreshTokens } = makeUseCase({
      findByHash: jest.fn().mockResolvedValue(
        storedToken({
          revokedAt: secondsAgo(3),
          revokedReason: 'rotated',
        }),
      ),
    });

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
    expect(refreshTokens.revokeFamily).not.toHaveBeenCalled();
  });

  it('should treat a token used after logout as reuse', async () => {
    const { useCase, refreshTokens } = makeUseCase({
      findByHash: jest
        .fn()
        .mockResolvedValue(
          storedToken({ revokedAt: secondsAgo(1), revokedReason: 'logout' }),
        ),
    });

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
    expect(refreshTokens.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      'reuse',
      NOW,
    );
  });

  it('should reject when a concurrent request rotated the token first', async () => {
    const { useCase, sessionIssuer } = makeUseCase({
      markRotated: jest.fn().mockResolvedValue(false),
    });

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenException);
    expect(sessionIssuer.continue).not.toHaveBeenCalled();
  });
});
