import { LogoutUseCase } from '../../../../src/application/auth/Logout.use-case';
import {
  NOW,
  makeOpaqueTokenService,
  makeRefreshTokenRepository,
} from './support/refresh-token.fixtures';

describe('LogoutUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should revoke every token of the session', async () => {
    const refreshTokens = makeRefreshTokenRepository();
    const useCase = new LogoutUseCase(refreshTokens, makeOpaqueTokenService());

    await useCase.execute({ refreshToken: 'raw-token' });

    expect(refreshTokens.findByHash).toHaveBeenCalledWith('hash:raw-token');
    expect(refreshTokens.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      'logout',
      NOW,
    );
  });

  it('should do nothing without a token', async () => {
    const refreshTokens = makeRefreshTokenRepository();
    const useCase = new LogoutUseCase(refreshTokens, makeOpaqueTokenService());

    await useCase.execute({});

    expect(refreshTokens.findByHash).not.toHaveBeenCalled();
  });

  it('should succeed silently with an unknown token', async () => {
    const refreshTokens = makeRefreshTokenRepository({
      findByHash: jest.fn().mockResolvedValue(null),
    });
    const useCase = new LogoutUseCase(refreshTokens, makeOpaqueTokenService());

    await expect(
      useCase.execute({ refreshToken: 'unknown' }),
    ).resolves.toBeUndefined();
    expect(refreshTokens.revokeFamily).not.toHaveBeenCalled();
  });
});
