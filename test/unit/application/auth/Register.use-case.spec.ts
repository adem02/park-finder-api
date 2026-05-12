import { RegisterUseCase } from '../../../../src/application/auth/Register.use-case';
import { EmailAlreadyInUseException } from '../../../../src/domain/exceptions/EmailAlreadyInUse.exception';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { User } from '../../../../src/domain/entities/User';
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

const makeUserRepository = (
  overrides: Partial<jest.Mocked<UserRepository>> = {},
): jest.Mocked<UserRepository> => ({
  findByEmail: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  findStatsByUserId: jest.fn(),
  ...overrides,
});

const makeCredentialsRepository = (): jest.Mocked<CredentialsRepository> => ({
  create: jest.fn().mockResolvedValue(undefined),
  findByUserId: jest.fn(),
  findByProviderId: jest.fn(),
  findLocalByUserId: jest.fn(),
});

const makeTokenService = (): jest.Mocked<TokenService> => ({
  sign: jest.fn().mockResolvedValue('access-token'),
  verify: jest.fn(),
});

const makePasswordService = (): jest.Mocked<PasswordService> => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
});

const makeUseCase = (
  userRepositoryOverrides: Partial<jest.Mocked<UserRepository>> = {},
) => {
  const userRepository = makeUserRepository(userRepositoryOverrides);
  const credentialsRepository = makeCredentialsRepository();
  const tokenService = makeTokenService();
  const passwordService = makePasswordService();

  const useCase = new RegisterUseCase(
    userRepository,
    credentialsRepository,
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

const validRequest = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'Secret1!',
};

describe('RegisterUseCase', () => {
  describe('execute', () => {
    it('should create a user, credentials and return an access token', async () => {
      const {
        useCase,
        userRepository,
        credentialsRepository,
        tokenService,
        passwordService,
      } = makeUseCase();

      const result = await useCase.execute(validRequest);

      expect(passwordService.hash).toHaveBeenCalledWith(validRequest.password);
      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(credentialsRepository.create).toHaveBeenCalledTimes(1);
      expect(tokenService.sign).toHaveBeenCalledWith(result.user.id);
      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(validRequest.email);
      expect(result.user.username).toBe(validRequest.username);
    });

    it('should create credentials with hashed password and local provider', async () => {
      const { useCase, credentialsRepository } = makeUseCase();

      await useCase.execute(validRequest);

      const createdCredentials = credentialsRepository.create.mock.calls[0][0];
      expect(createdCredentials.provider).toBe('local');
      expect(createdCredentials.passwordHash).toBe('hashed-password');
    });

    it('should throw EmailAlreadyInUseException if email is taken', async () => {
      const existingUser = makeUser();
      const { useCase } = makeUseCase({
        findByEmail: jest.fn().mockResolvedValue(existingUser),
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        EmailAlreadyInUseException,
      );
    });

    it('should not create user or credentials if email is already taken', async () => {
      const existingUser = makeUser();
      const { useCase, userRepository, credentialsRepository } = makeUseCase({
        findByEmail: jest.fn().mockResolvedValue(existingUser),
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(credentialsRepository.create).not.toHaveBeenCalled();
    });
  });
});
