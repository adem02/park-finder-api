import { DeleteAccountUseCase } from '../../../../src/application/user/DeleteAccount.use-case';
import type { UserRepository } from '../../../../src/application/gateway/User.repository';
import { User } from '../../../../src/domain/entities/User';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { SYSTEM_USER } from '../../../../src/domain/constants/user.constants';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { SystemAccountDeletionException } from '../../../../src/domain/exceptions/SystemAccountDeletion.exception';

const makeUser = () =>
  User.reconstitute({
    id: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    pointsBalance: PointsBalanceVO.create(40),
    createdAt: new Date(),
  });

const makeUserRepository = (
  overrides: Partial<jest.Mocked<UserRepository>> = {},
): jest.Mocked<UserRepository> => ({
  findById: jest.fn().mockResolvedValue(makeUser()),
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  updatePointsById: jest.fn(),
  deleteById: jest.fn(),
  anonymize: jest.fn().mockResolvedValue(undefined),
  findStatsByUserId: jest.fn(),
  ...overrides,
});

describe('DeleteAccountUseCase', () => {
  it('anonymizes the account and hands its parkings to the system account', async () => {
    const userRepository = makeUserRepository();

    await new DeleteAccountUseCase(userRepository).execute({
      userId: 'user-1',
    });

    expect(userRepository.anonymize).toHaveBeenCalledWith(
      'user-1',
      SYSTEM_USER,
    );
  });

  it('never hard-deletes the user row', async () => {
    const userRepository = makeUserRepository();

    await new DeleteAccountUseCase(userRepository).execute({
      userId: 'user-1',
    });

    expect(userRepository.deleteById).not.toHaveBeenCalled();
  });

  it('throws when the user does not exist', async () => {
    const userRepository = makeUserRepository({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(
      new DeleteAccountUseCase(userRepository).execute({ userId: 'ghost' }),
    ).rejects.toThrow(ResourceNotFoundException);
    expect(userRepository.anonymize).not.toHaveBeenCalled();
  });

  it('refuses to delete the system account', async () => {
    const userRepository = makeUserRepository();

    await expect(
      new DeleteAccountUseCase(userRepository).execute({
        userId: SYSTEM_USER.id,
      }),
    ).rejects.toThrow(SystemAccountDeletionException);
    expect(userRepository.anonymize).not.toHaveBeenCalled();
  });
});
