import { CommentParkingUseCase } from '../../../../src/application/comment/CommentParking.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { InvalidCommentContentLengthException } from '../../../../src/domain/exceptions/InvalidCommentContentLength.exception';
import { User } from '../../../../src/domain/entities/User';
import { Parking } from '../../../../src/domain/entities/Parking';
import { Comment } from '../../../../src/domain/entities/Comment';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import type {
  CommentRepository,
  ParkingRepository,
  UserRepository,
} from '../../../../src/application/gateway';

const makeUser = (id = 'user-1') =>
  User.reconstitute({
    id,
    username: 'johndoe',
    email: 'john@example.com',
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeParking = () =>
  Parking.reconstitute({
    id: 'parking-1',
    name: 'Parking Centrale',
    totalSpots: 50,
    photos: [],
    coordinates: CoordinatesVO.reconstruct(9.537, -13.6773),
    addedBy: makeUser(),
    createdAt: new Date(),
  });

const makeParkingRepository = (
  overrides: Partial<jest.Mocked<ParkingRepository>> = {},
): jest.Mocked<ParkingRepository> => ({
  findNearBy: jest.fn(),
  findById: jest.fn().mockResolvedValue(makeParking()),
  create: jest.fn(),
  updateById: jest.fn(),
  findByUserId: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
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
  findStatsByUserId: jest.fn(),
  ...overrides,
});

const makeCommentRepository = (
  overrides: Partial<jest.Mocked<CommentRepository>> = {},
): jest.Mocked<CommentRepository> => ({
  findByParkingId: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
});

const makeUseCase = (
  overrides: {
    parking?: Partial<jest.Mocked<ParkingRepository>>;
    user?: Partial<jest.Mocked<UserRepository>>;
    comment?: Partial<jest.Mocked<CommentRepository>>;
  } = {},
) => {
  const parkingRepository = makeParkingRepository(overrides.parking);
  const userRepository = makeUserRepository(overrides.user);
  const commentRepository = makeCommentRepository(overrides.comment);
  const useCase = new CommentParkingUseCase(
    parkingRepository,
    commentRepository,
    userRepository,
  );
  return { useCase, parkingRepository, userRepository, commentRepository };
};

const validRequest = {
  userId: 'user-1',
  parkingId: 'parking-1',
  content: 'Great parking spot, easy access!',
};

describe('CommentParkingUseCase', () => {
  describe('execute', () => {
    it('should create a comment and persist it', async () => {
      const { useCase, commentRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(commentRepository.create).toHaveBeenCalledWith(
        expect.any(Comment),
      );
    });

    it('should save a comment with the correct content', async () => {
      const { useCase, commentRepository } = makeUseCase();

      await useCase.execute({ ...validRequest, content: 'Super pratique !' });

      expect(commentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Super pratique !' }),
      );
    });

    it('should save a comment linked to the correct parking and author', async () => {
      const { useCase, commentRepository } = makeUseCase();

      await useCase.execute(validRequest);

      const createdComment = commentRepository.create.mock.calls[0][0];
      expect(createdComment.parking.id).toBe('parking-1');
      expect(createdComment.author.id).toBe('user-1');
    });

    it('should fetch parking and user in parallel', async () => {
      const order: string[] = [];
      const { useCase } = makeUseCase({
        parking: {
          findById: jest.fn().mockImplementation(() => {
            order.push('parking');
            return makeParking();
          }),
        },
        user: {
          findById: jest.fn().mockImplementation(() => {
            order.push('user');
            return makeUser();
          }),
        },
      });

      await useCase.execute(validRequest);

      expect(order).toHaveLength(2);
      expect(order).toContain('parking');
      expect(order).toContain('user');
    });

    it('should throw ResourceNotFoundException when user is not found', async () => {
      const { useCase } = makeUseCase({
        user: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should include the userId in the error message when user not found', async () => {
      const { useCase } = makeUseCase({
        user: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        validRequest.userId,
      );
    });

    it('should throw ResourceNotFoundException when parking is not found', async () => {
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should include the parkingId in the error message when parking not found', async () => {
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        validRequest.parkingId,
      );
    });

    it('should not call commentRepository.create when user is not found', async () => {
      const { useCase, commentRepository } = makeUseCase({
        user: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow();
      expect(commentRepository.create).not.toHaveBeenCalled();
    });

    it('should not call commentRepository.create when parking is not found', async () => {
      const { useCase, commentRepository } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow();
      expect(commentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw InvalidCommentContentLengthException when content is empty', async () => {
      const { useCase } = makeUseCase();

      await expect(
        useCase.execute({ ...validRequest, content: '' }),
      ).rejects.toThrow(InvalidCommentContentLengthException);
    });

    it('should throw InvalidCommentContentLengthException when content exceeds 500 characters', async () => {
      const { useCase } = makeUseCase();

      await expect(
        useCase.execute({ ...validRequest, content: 'a'.repeat(501) }),
      ).rejects.toThrow(InvalidCommentContentLengthException);
    });

    it('should not persist the comment when content is invalid', async () => {
      const { useCase, commentRepository } = makeUseCase();

      await expect(
        useCase.execute({ ...validRequest, content: '' }),
      ).rejects.toThrow();
      expect(commentRepository.create).not.toHaveBeenCalled();
    });

    it('should generate a comment with an id and a createdAt date', async () => {
      const { useCase, commentRepository } = makeUseCase();

      await useCase.execute(validRequest);

      const createdComment = commentRepository.create.mock.calls[0][0];
      expect(typeof createdComment.id).toBe('string');
      expect(createdComment.id.length).toBeGreaterThan(0);
      expect(createdComment.createdAt).toBeInstanceOf(Date);
    });

    it('should propagate the error when commentRepository.create throws', async () => {
      const { useCase } = makeUseCase({
        comment: {
          create: jest.fn().mockRejectedValue(new Error('DB error')),
        },
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow('DB error');
    });
  });
});
