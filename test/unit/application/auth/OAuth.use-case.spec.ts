import { OAuthUseCase } from '../../../../src/application/auth/OAuth.use-case';
import { User } from '../../../../src/domain/entities/User';
import { UserCredentials } from '../../../../src/domain/entities/UserCredentials';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import type { UserRepository } from '../../../../src/application/gateway/User.repository';
import type { CredentialsRepository } from '../../../../src/application/gateway/Credentials.repository';
import { makeSessionIssuer } from './support/session-issuer.mock';
import type { Logger } from '../../../../src/common/interfaces/Logger';

const makeUser = (
  overrides: Partial<{ id: string; username: string; email: string }> = {},
) =>
  User.create({
    id: overrides.id ?? 'user-1',
    username: overrides.username ?? 'johndoe',
    email: overrides.email ?? 'john@example.com',
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeCredentials = () =>
  UserCredentials.create({
    id: 'cred-1',
    userId: 'user-1',
    provider: 'google',
    providerId: 'google-123',
  });

const makeLogger = (): jest.Mocked<Logger> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const makeUserRepository = (
  overrides: Partial<jest.Mocked<UserRepository>> = {},
): jest.Mocked<UserRepository> => ({
  findById: jest.fn().mockResolvedValue(makeUser()),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  anonymize: jest.fn(),
  updatePointsById: jest.fn(),
  withdrawPointsById: jest.fn(),
  findStatsByUserId: jest.fn(),
  ...overrides,
});

const makeCredentialsRepository = (
  overrides: Partial<jest.Mocked<CredentialsRepository>> = {},
): jest.Mocked<CredentialsRepository> => ({
  findByProviderId: jest.fn().mockResolvedValue(null),
  findByUserId: jest.fn(),
  findLocalByUserId: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeUseCase = (
  overrides: {
    userRepository?: Partial<jest.Mocked<UserRepository>>;
    credentialsRepository?: Partial<jest.Mocked<CredentialsRepository>>;
  } = {},
) => {
  const userRepository = makeUserRepository(overrides.userRepository);
  const credentialsRepository = makeCredentialsRepository(
    overrides.credentialsRepository,
  );
  const sessionIssuer = makeSessionIssuer();
  const logger = makeLogger();

  const useCase = new OAuthUseCase(
    userRepository,
    credentialsRepository,
    sessionIssuer,
    logger,
  );

  return {
    useCase,
    userRepository,
    credentialsRepository,
    sessionIssuer,
    logger,
  };
};

const googleRequest = {
  provider: 'google' as const,
  providerId: 'google-123',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  photoUrl: 'https://photo.url',
};

describe('OAuthUseCase', () => {
  describe('execute — existing user', () => {
    it('should return existing user and access token', async () => {
      const existingCredentials = makeCredentials();
      const existingUser = makeUser();

      const { useCase, userRepository, credentialsRepository } = makeUseCase({
        credentialsRepository: {
          findByProviderId: jest.fn().mockResolvedValue(existingCredentials),
        },
        userRepository: {
          findById: jest.fn().mockResolvedValue(existingUser),
        },
      });

      const result = await useCase.execute(googleRequest);

      expect(credentialsRepository.create).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(result.user).toBe(existingUser);
      expect(result.accessToken).toBe('access-token');
    });

    it('should throw if credentials exist but user is missing', async () => {
      const existingCredentials = makeCredentials();

      const { useCase, logger } = makeUseCase({
        credentialsRepository: {
          findByProviderId: jest.fn().mockResolvedValue(existingCredentials),
        },
        userRepository: {
          findById: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(useCase.execute(googleRequest)).rejects.toThrow(
        'User not found for existing OAuth credentials',
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Data inconsistency: credentials exist for userId ${existingCredentials.userId} but user not found`,
      );
    });
  });

  describe('execute — new user', () => {
    it('should create user and credentials on first OAuth login', async () => {
      const { useCase, userRepository, credentialsRepository, sessionIssuer } =
        makeUseCase();

      const result = await useCase.execute(googleRequest);

      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(credentialsRepository.create).toHaveBeenCalledTimes(1);
      expect(sessionIssuer.start).toHaveBeenCalledWith(result.user.id);
      expect(result.accessToken).toBe('access-token');
    });

    it('should create credentials with correct provider and providerId', async () => {
      const { useCase, credentialsRepository } = makeUseCase();

      await useCase.execute(googleRequest);

      const createdCredentials = credentialsRepository.create.mock.calls[0][0];
      expect(createdCredentials.provider).toBe('google');
      expect(createdCredentials.providerId).toBe('google-123');
    });

    it('should set user email and photoUrl from OAuth profile', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute(googleRequest);

      const createdUser: User = userRepository.create.mock.calls[0][0];
      expect(createdUser.email).toBe(googleRequest.email);
      expect(createdUser.photoUrl).toBe(googleRequest.photoUrl);
    });
  });

  describe('unique username', () => {
    it('should append a suffix when the name-based username is taken', async () => {
      const findByUsername = jest
        .fn()
        .mockImplementation((username: string) =>
          Promise.resolve(username === 'johndoe' ? makeUser() : null),
        );
      const { useCase, userRepository } = makeUseCase({
        userRepository: { findByUsername },
      });

      await useCase.execute(googleRequest);

      const createdUser: User = userRepository.create.mock.calls[0][0];
      expect(createdUser.username).toMatch(/^johndoe[0-9a-f]{6}$/);
    });

    it('should keep the name-based username when it is free', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute(googleRequest);

      const createdUser: User = userRepository.create.mock.calls[0][0];
      expect(createdUser.username).toBe('johndoe');
    });
  });

  describe('buildUsername', () => {
    it('should build username from firstName + lastName', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute({
        ...googleRequest,
        firstName: 'John',
        lastName: 'Doe',
      });

      const createdUser: User = userRepository.create.mock.calls[0][0];
      expect(createdUser.username).toBe('johndoe');
    });

    it('should fallback to email prefix if no name provided', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute({
        provider: 'google',
        providerId: 'google-123',
        email: 'jane.doe@example.com',
      });

      const createdUser: User = userRepository.create.mock.calls[0][0];
      expect(createdUser.username).toBe('janedoe');
    });

    it('should truncate username to 50 chars', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute({
        ...googleRequest,
        firstName: 'a'.repeat(30),
        lastName: 'b'.repeat(30),
      });

      const createdUser: User = userRepository.create.mock.calls[0][0];
      expect(createdUser.username.length).toBe(50);
    });

    it('should use an 8-char UUID fallback if derived username is too short', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute({
        provider: 'google',
        providerId: 'google-123',
        email: 'a@b.com',
      });

      const createdUser: User = userRepository.create.mock.calls[0][0];
      expect(createdUser.username.length).toBe(8);
    });
  });
});
