import { GetParkingDetailsUseCase } from '../../../../src/application/parking/GetParkingDetails.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { AvailabilityReport } from '../../../../src/domain/entities/AvailabilityReport';
import { Vote } from '../../../../src/domain/entities/Vote';
import { VoteType } from '../../../../src/domain/types/vote.types';
import type { ParkingRepository } from '../../../../src/application/gateway/Parking.repository';
import type { AvailabilityRepository } from '../../../../src/application/gateway/Availability.repository';
import type { VoteRepository } from '../../../../src/application/gateway/Vote.repository';
import type { CommentRepository } from '../../../../src/application/gateway/Comment.repository';
import { Comment } from '../../../../src/domain/entities/Comment';

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

const makeRecentReport = (availableSpots = 12) =>
  AvailabilityReport.create({
    id: 'report-1',
    parking: makeParking(),
    reportedBy: makeUser('reporter-1', 'reporter'),
    availableSpots,
    reportedAt: new Date(),
  });

const makeVote = (voteType: VoteType, userId = 'user-x') =>
  Vote.create({
    id: `vote-${userId}-${voteType}`,
    parking: makeParking(),
    votedBy: makeUser(userId, userId),
    voteType,
    createdAt: new Date(),
  });

const makeComment = (id = 'comment-1') =>
  Comment.create({
    id,
    content: 'Bon parking',
    parking: makeParking(),
    author: makeUser('author-1', 'author'),
    createdAt: new Date(),
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

const makeAvailabilityRepository = (
  overrides: Partial<jest.Mocked<AvailabilityRepository>> = {},
): jest.Mocked<AvailabilityRepository> => ({
  findLatestByParkingId: jest.fn().mockResolvedValue(null),
  findByParkingId: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  expireOld: jest.fn(),
  ...overrides,
});

const makeVoteRepository = (
  overrides: Partial<jest.Mocked<VoteRepository>> = {},
): jest.Mocked<VoteRepository> => ({
  findByParkingIdAndUserId: jest.fn().mockResolvedValue(null),
  findByParkingId: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  update: jest.fn(),
  cancelByParkingIdAndUserId: jest.fn(),
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
    availability?: Partial<jest.Mocked<AvailabilityRepository>>;
    vote?: Partial<jest.Mocked<VoteRepository>>;
    comment?: Partial<jest.Mocked<CommentRepository>>;
  } = {},
) => {
  const parkingRepository = makeParkingRepository(overrides.parking);
  const availabilityRepository = makeAvailabilityRepository(
    overrides.availability,
  );
  const voteRepository = makeVoteRepository(overrides.vote);
  const commentRepository = makeCommentRepository(overrides.comment);
  const useCase = new GetParkingDetailsUseCase(
    parkingRepository,
    availabilityRepository,
    voteRepository,
    commentRepository,
  );
  return {
    useCase,
    parkingRepository,
    availabilityRepository,
    voteRepository,
    commentRepository,
  };
};

describe('GetParkingDetailsUseCase', () => {
  describe('execute', () => {
    it('should return the parking when found', async () => {
      const parking = makeParking();
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(parking) },
      });

      const result = await useCase.execute({ id: 'parking-1' });

      expect(result.parking).toBe(parking);
    });

    it('should call findById with the provided id', async () => {
      const { useCase, parkingRepository } = makeUseCase();

      await useCase.execute({ id: 'parking-1' });

      expect(parkingRepository.findById).toHaveBeenCalledWith('parking-1');
    });

    it('should throw ResourceNotFoundException when parking is not found', async () => {
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute({ id: 'unknown-id' })).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should include the parking id in the error message', async () => {
      const { useCase } = makeUseCase({
        parking: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(useCase.execute({ id: 'unknown-id' })).rejects.toThrow(
        'unknown-id',
      );
    });

    it('should return null latestReport when no report exists', async () => {
      const { useCase } = makeUseCase();

      const result = await useCase.execute({ id: 'parking-1' });

      expect(result.latestReport).toBeNull();
    });

    it('should return the latest report when one exists', async () => {
      const report = makeRecentReport(8);
      const { useCase } = makeUseCase({
        availability: {
          findLatestByParkingId: jest.fn().mockResolvedValue(report),
        },
      });

      const result = await useCase.execute({ id: 'parking-1' });

      expect(result.latestReport).toBe(report);
    });

    it('should return all votes for the parking', async () => {
      const votes = [
        makeVote(VoteType.UPVOTE, 'a'),
        makeVote(VoteType.UPVOTE, 'b'),
        makeVote(VoteType.DOWNVOTE, 'c'),
      ];
      const { useCase } = makeUseCase({
        vote: { findByParkingId: jest.fn().mockResolvedValue(votes) },
      });

      const result = await useCase.execute({ id: 'parking-1' });

      expect(result.votes).toBe(votes);
    });

    it('should return the user vote when userId is provided', async () => {
      const userVote = makeVote(VoteType.UPVOTE, 'user-1');
      const { useCase, voteRepository } = makeUseCase({
        vote: {
          findByParkingIdAndUserId: jest.fn().mockResolvedValue(userVote),
        },
      });

      const result = await useCase.execute({
        id: 'parking-1',
        userId: 'user-1',
      });

      expect(voteRepository.findByParkingIdAndUserId).toHaveBeenCalledWith(
        'parking-1',
        'user-1',
      );
      expect(result.userVote).toBe(userVote);
    });

    it('should not query the user vote when no userId is provided', async () => {
      const { useCase, voteRepository } = makeUseCase();

      const result = await useCase.execute({ id: 'parking-1' });

      expect(voteRepository.findByParkingIdAndUserId).not.toHaveBeenCalled();
      expect(result.userVote).toBeNull();
    });

    it('should return the recent comments for the parking', async () => {
      const comments = [makeComment('c1'), makeComment('c2')];
      const { useCase, commentRepository } = makeUseCase({
        comment: {
          findRecentByParkingId: jest.fn().mockResolvedValue(comments),
        },
      });

      const result = await useCase.execute({ id: 'parking-1' });

      expect(commentRepository.findRecentByParkingId).toHaveBeenCalledWith(
        'parking-1',
        3,
      );
      expect(result.recentComments).toBe(comments);
    });
  });
});
