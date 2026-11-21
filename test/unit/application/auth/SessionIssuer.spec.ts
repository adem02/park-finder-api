import { SessionIssuer } from '../../../../src/application/auth/SessionIssuer';
import type { TokenService } from '../../../../src/application/gateway/Token.service';
import {
  NOW,
  makeOpaqueTokenService,
  makeRefreshTokenRepository,
} from './support/refresh-token.fixtures';

const makeIssuer = () => {
  const tokenService: jest.Mocked<TokenService> = {
    sign: jest.fn().mockResolvedValue('access-token'),
    verify: jest.fn(),
  };
  const refreshTokens = makeRefreshTokenRepository();
  const issuer = new SessionIssuer(
    tokenService,
    makeOpaqueTokenService(),
    refreshTokens,
  );
  return { issuer, tokenService, refreshTokens };
};

const createdToken = (
  refreshTokens: ReturnType<typeof makeRefreshTokenRepository>,
) => refreshTokens.create.mock.calls[0]?.[0];

describe('SessionIssuer', () => {
  it('should return an access token and the raw refresh token, storing only its hash', async () => {
    const { issuer, tokenService, refreshTokens } = makeIssuer();

    const session = await issuer.start('user-1', NOW);

    expect(tokenService.sign).toHaveBeenCalledWith('user-1');
    expect(session.accessToken).toBe('access-token');
    expect(session.refreshToken.value).toBe('new-raw-token');
    expect(session.refreshToken.expiresAt).toEqual(
      new Date('2026-12-21T12:00:00Z'),
    );
    expect(createdToken(refreshTokens).tokenHash).toBe('hash:new-raw-token');
  });

  it('should start a new family on login and keep it on rotation', async () => {
    const { issuer, refreshTokens } = makeIssuer();

    await issuer.start('user-1', NOW);
    const firstFamily = createdToken(refreshTokens).familyId;
    refreshTokens.create.mockClear();
    await issuer.continue('user-1', 'family-42', NOW);

    expect(firstFamily).toEqual(expect.any(String));
    expect(firstFamily).not.toBe('family-42');
    expect(createdToken(refreshTokens).familyId).toBe('family-42');
  });

  it('should purge the user expired tokens before issuing', async () => {
    const { issuer, refreshTokens } = makeIssuer();

    await issuer.start('user-1', NOW);

    expect(refreshTokens.deleteExpiredByUserId).toHaveBeenCalledWith(
      'user-1',
      NOW,
    );
  });
});
