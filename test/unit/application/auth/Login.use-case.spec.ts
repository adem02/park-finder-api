import { LoginUseCase } from '../../../../src/application/auth/Login.use-case';
import { WrongEmailOrPasswordException } from '../../../../src/domain/exceptions/WrongEmailOrPassword.exception';
import { InvalidProviderException } from '../../../../src/domain/exceptions/InvalidProvider.exception';
import { User } from '../../../../src/domain/entities/User';
import { UserCredentials } from '../../../../src/domain/entities/UserCredentials';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import type { UserRepository } from '../../../../src/application/gateway/User.repository';
import type { CredentialsRepository } from '../../../../src/application/gateway/Credentials.repository';
import type { TokenService } from '../../../../src/application/gateway/Token.service';
import type { PasswordService } from '../../../../src/application/gateway/Password.service';

const makeUser = () =>
  User.create({
    id: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeLocalCredentials = () =>
  UserCredentials.create({
    id: 'cred-1',
    userId: 'user-1',
    provider: 'local',
    passwordHash: 'hashed-password',
  });

const makeUserRepository = (
  overrides: Partial<jest.Mocked<UserRepository>> = {},
): jest.Mocked<UserRepository> => ({
  findByEmail: jest.fn().mockResolvedValue(makeUser()),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  updatePointsById: jest.fn(),
  findStatsByUserId: jest.fn(),
  ...overrides,
});

const makeCredentialsRepository = (
  overrides: Partial<jest.Mocked<CredentialsRepository>> = {},
): jest.Mocked<CredentialsRepository> => ({
  findLocalByUserId: jest.fn().mockResolvedValue(makeLocalCredentials()),
  findByUserId: jest.fn(),
  findByProviderId: jest.fn(),
  create: jest.fn(),
  ...overrides,
});

const makeTokenService = (): jest.Mocked<TokenService> => ({
  sign: jest.fn().mockResolvedValue('access-token'),
  verify: jest.fn(),
});

const makePasswordService = (isMatch = true): jest.Mocked<PasswordService> => ({
  hash: jest.fn(),
  compare: jest.fn().mockResolvedValue(isMatch),
});

const makeUseCase = (
  overrides: {
    userRepository?: Partial<jest.Mocked<UserRepository>>;
    credentialsRepository?: Partial<jest.Mocked<CredentialsRepository>>;
    passwordService?: jest.Mocked<PasswordService>;
  } = {},
) => {
  const userRepository = makeUserRepository(overrides.userRepository);
  const credentialsRepository = makeCredentialsRepository(
    overrides.credentialsRepository,
  );
  const tokenService = makeTokenService();
  const passwordService = overrides.passwordService ?? makePasswordService();

  const useCase = new LoginUseCase(
    credentialsRepository,
    userRepository,
    tokenService,
    passwordService,
  );

  return {
    useCase,
    userRepository,
    credentialsRepository,
    tokenService,
    passwordService,
  };
};

const validRequest = { email: 'john@example.com', password: 'Secret1!' };

describe('LoginUseCase', () => {
  describe('execute', () => {
    it('should return user and access token on valid credentials', async () => {
      const { useCase, tokenService } = makeUseCase();

      const result = await useCase.execute(validRequest);

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(validRequest.email);
      expect(tokenService.sign).toHaveBeenCalledWith('user-1');
    });

    it('should throw WrongEmailOrPasswordException if user not found', async () => {
      const { useCase } = makeUseCase({
        userRepository: { findByEmail: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        WrongEmailOrPasswordException,
      );
    });

    it('should throw WrongEmailOrPasswordException if password is incorrect', async () => {
      const { useCase } = makeUseCase({
        passwordService: makePasswordService(false),
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        WrongEmailOrPasswordException,
      );
    });

    it('should throw InvalidProviderException if user has no local credentials', async () => {
      const { useCase } = makeUseCase({
        credentialsRepository: {
          findLocalByUserId: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        InvalidProviderException,
      );
    });

    it('should throw InvalidProviderException if credentials provider is not local', async () => {
      const oauthCredentials = UserCredentials.create({
        id: 'cred-2',
        userId: 'user-1',
        provider: 'google',
        providerId: 'google-id-123',
      });

      const { useCase } = makeUseCase({
        credentialsRepository: {
          findLocalByUserId: jest.fn().mockResolvedValue(oauthCredentials),
        },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        InvalidProviderException,
      );
    });

    it('should compare password with stored hash', async () => {
      const { useCase, passwordService } = makeUseCase();

      await useCase.execute(validRequest);

      expect(passwordService.compare).toHaveBeenCalledWith(
        validRequest.password,
        'hashed-password',
      );
    });
  });
});
