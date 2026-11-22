import { ListParkingCommentsUseCase } from '../../../../src/application/comment/ListParkingComments.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { Comment } from '../../../../src/domain/entities/Comment';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';
import type { CommentRepository } from '../../../../src/application/gateway/Comment.repository';

const makeUser = (id = 'user-1', username = 'johndoe') =>
  User.reconstitute({
    id,
    username,
    pointsBalance: PointsBalanceVO.create(0),
    createdAt: new Date(),
  });

const makeParking = () =>
  Parking.reconstitute({
    id: 'parking-1',
    name: 'Parking Centrale',
    totalSpots: 50,
    photos: ['https://example.com/photo.jpg'],
    coordinates: CoordinatesVO.reconstruct(9.537, -13.6773),
    addedBy: makeUser(),
    createdAt: new Date(),
  });

const makeComment = (id: string, createdAt: Date) =>
  Comment.create({
    id,
    content: `content-${id}`,
    parking: makeParking(),
    author: makeUser('author-1', 'author'),
    createdAt,
  });

const makeParkingRepository = (
  overrides: Partial<jest.Mocked<ParkingRepository>> = {},
): jest.Mocked<ParkingRepository> => ({
  findById: jest.fn().mockResolvedValue(makeParking()),
  findNearBy: jest.fn(),
  findNearByWithDetails: jest.fn(),
  create: jest.fn(),
  findByUserId: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
});

const makeCommentRepository = (
  overrides: Partial<jest.Mocked<CommentRepository>> = {},
): jest.Mocked<CommentRepository> => ({
  findRecentByParkingId: jest.fn().mockResolvedValue([]),
  findPageByParkingId: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  ...overrides,
});

const makeUseCase = (
  overrides: {
    parking?: Partial<jest.Mocked<ParkingRepository>>;
    comment?: Partial<jest.Mocked<CommentRepository>>;
  } = {},
) => {
  const parkingRepository = makeParkingRepository(overrides.parking);
  const commentRepository = makeCommentRepository(overrides.comment);
  const useCase = new ListParkingCommentsUseCase(
    parkingRepository,
    commentRepository,
  );
  return { useCase, parkingRepository, commentRepository };
};

describe('ListParkingCommentsUseCase', () => {
  describe('execute', () => {
    it('should throw ResourceNotFoundException when the parking does not exist', async () => {
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        useCase.execute({ parkingId: 'unknown-id' }),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should use the default limit when none is provided', async () => {
      const { useCase, commentRepository } = makeUseCase();

      await useCase.execute({ parkingId: 'parking-1' });

      expect(commentRepository.findPageByParkingId).toHaveBeenCalledWith(
        'parking-1',
        null,
        21,
      );
    });

    it('should cap the limit at the maximum allowed', async () => {
      const { useCase, commentRepository } = makeUseCase();

      await useCase.execute({ parkingId: 'parking-1', limit: 999 });

      expect(commentRepository.findPageByParkingId).toHaveBeenCalledWith(
        'parking-1',
        null,
        51,
      );
    });

    it('should pass the cursor to the repository', async () => {
      const cursor = { createdAt: new Date('2026-01-01'), id: 'c-1' };
      const { useCase, commentRepository } = makeUseCase();

      await useCase.execute({ parkingId: 'parking-1', cursor, limit: 5 });

      expect(commentRepository.findPageByParkingId).toHaveBeenCalledWith(
        'parking-1',
        cursor,
        6,
      );
    });

    it('should return all items and a null nextCursor when there is no next page', async () => {
      const comments = [
        makeComment('c1', new Date('2026-01-03')),
        makeComment('c2', new Date('2026-01-02')),
      ];
      const { useCase } = makeUseCase({
        comment: {
          findPageByParkingId: jest.fn().mockResolvedValue(comments),
        },
      });

      const result = await useCase.execute({
        parkingId: 'parking-1',
        limit: 5,
      });

      expect(result.items).toEqual(comments);
      expect(result.nextCursor).toBeNull();
    });

    it('should slice items and expose nextCursor when more results are available', async () => {
      const limit = 2;
      const c1 = makeComment('c1', new Date('2026-01-03'));
      const c2 = makeComment('c2', new Date('2026-01-02'));
      const c3 = makeComment('c3', new Date('2026-01-01'));
      const { useCase } = makeUseCase({
        comment: {
          findPageByParkingId: jest.fn().mockResolvedValue([c1, c2, c3]),
        },
      });

      const result = await useCase.execute({ parkingId: 'parking-1', limit });

      expect(result.items).toEqual([c1, c2]);
      expect(result.nextCursor).toEqual({
        createdAt: c2.createdAt,
        id: c2.id,
      });
    });
  });
});
