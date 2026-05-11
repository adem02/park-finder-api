import { RefreshTokenUseCase } from '../../../../src/application/auth/RefreshToken.use-case';
import type { TokenService } from '../../../../src/application/gateway/Token.service';

const makeTokenService = (): jest.Mocked<TokenService> => ({
  sign: jest.fn().mockResolvedValue('new-access-token'),
  verify: jest.fn(),
});

const makeUseCase = () => {
  const tokenService = makeTokenService();
  const useCase = new RefreshTokenUseCase(tokenService);
  return { useCase, tokenService };
};

describe('RefreshTokenUseCase', () => {
  it('should return a new access token', async () => {
    const { useCase } = makeUseCase();

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.accessToken).toBe('new-access-token');
  });

  it('should call tokenService.sign with the provided userId', async () => {
    const { useCase, tokenService } = makeUseCase();

    await useCase.execute({ userId: 'user-1' });

    expect(tokenService.sign).toHaveBeenCalledWith('user-1');
    expect(tokenService.sign).toHaveBeenCalledTimes(1);
  });
});
