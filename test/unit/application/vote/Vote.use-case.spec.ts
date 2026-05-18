import { VoteUseCase } from '../../../../src/application/vote/Vote.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import { AlreadyVotedException } from '../../../../src/domain/exceptions/AlreadyVoted.exception';
import { User } from '../../../../src/domain/entities/User';
import { Parking } from '../../../../src/domain/entities/Parking';
import { Vote } from '../../../../src/domain/entities/Vote';
import { VoteType } from '../../../../src/domain/types/vote.types';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { POINTS_PER_ACTION } from '../../../../src/domain/constants/points.contants';
import type { VoteRepository } from '../../../../src/application/gateway';
import type { UserRepository } from '../../../../src/application/gateway';
import type { ParkingRepository } from '../../../../src/application/gateway';

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

const makeVote = (voteType: VoteType) =>
  Vote.create({
    id: 'vote-1',
    parking: makeParking(),
    votedBy: makeUser(),
    voteType,
    createdAt: new Date(),
  });

const makeVoteRepository = (
  overrides: Partial<jest.Mocked<VoteRepository>> = {},
): jest.Mocked<VoteRepository> => ({
  findByParkingIdAndUserId: jest.fn().mockResolvedValue(null),
  findByParkingId: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  cancelByParkingIdAndUserId: jest.fn(),
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
  updatePointsById: jest.fn().mockResolvedValue(undefined),
  deleteById: jest.fn(),
  findStatsByUserId: jest.fn(),
  ...overrides,
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

const makeUseCase = (
  overrides: {
    vote?: Partial<jest.Mocked<VoteRepository>>;
    user?: Partial<jest.Mocked<UserRepository>>;
    parking?: Partial<jest.Mocked<ParkingRepository>>;
  } = {},
) => {
  const voteRepository = makeVoteRepository(overrides.vote);
  const userRepository = makeUserRepository(overrides.user);
  const parkingRepository = makeParkingRepository(overrides.parking);
  const useCase = new VoteUseCase(
    voteRepository,
    userRepository,
    parkingRepository,
  );
  return { useCase, voteRepository, userRepository, parkingRepository };
};

const validRequest = {
  userId: 'user-1',
  parkingId: 'parking-1',
  type: VoteType.UPVOTE,
};

describe('VoteUseCase', () => {
  describe('new vote (no existing vote)', () => {
    it('should create and persist the vote', async () => {
      const { useCase, voteRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(voteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ voteType: VoteType.UPVOTE }),
      );
    });

    it('should award VOTE_CAST points to the user', async () => {
      const { useCase, userRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(userRepository.updatePointsById).toHaveBeenCalledWith(
        validRequest.userId,
        POINTS_PER_ACTION.VOTE_CAST,
      );
    });

    it('should not call voteRepository.update on a new vote', async () => {
      const { useCase, voteRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(voteRepository.update).not.toHaveBeenCalled();
    });

    it('should create a vote with the correct parking and user', async () => {
      const { useCase, voteRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(voteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          voteType: validRequest.type,
        }),
      );
    });
  });

  describe('change vote (existing vote, different type)', () => {
    it('should call voteRepository.update with the changed vote type', async () => {
      const { useCase, voteRepository } = makeUseCase({
        vote: {
          findByParkingIdAndUserId: jest
            .fn()
            .mockResolvedValue(makeVote(VoteType.UPVOTE)),
        },
      });

      await useCase.execute({ ...validRequest, type: VoteType.DOWNVOTE });

      expect(voteRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ voteType: VoteType.DOWNVOTE }),
      );
    });

    it('should not create a new vote when changing vote type', async () => {
      const { useCase, voteRepository } = makeUseCase({
        vote: {
          findByParkingIdAndUserId: jest
            .fn()
            .mockResolvedValue(makeVote(VoteType.UPVOTE)),
        },
      });

      await useCase.execute({ ...validRequest, type: VoteType.DOWNVOTE });

      expect(voteRepository.create).not.toHaveBeenCalled();
    });

    it('should not award points when changing vote type', async () => {
      const { useCase, userRepository } = makeUseCase({
        vote: {
          findByParkingIdAndUserId: jest
            .fn()
            .mockResolvedValue(makeVote(VoteType.UPVOTE)),
        },
      });

      await useCase.execute({ ...validRequest, type: VoteType.DOWNVOTE });

      expect(userRepository.updatePointsById).not.toHaveBeenCalled();
    });
  });

  describe('duplicate vote (existing vote, same type)', () => {
    it('should throw AlreadyVotedException', async () => {
      const { useCase } = makeUseCase({
        vote: {
          findByParkingIdAndUserId: jest
            .fn()
            .mockResolvedValue(makeVote(VoteType.UPVOTE)),
        },
      });

      await expect(
        useCase.execute({ ...validRequest, type: VoteType.UPVOTE }),
      ).rejects.toThrow(AlreadyVotedException);
    });

    it('should not persist anything on duplicate vote', async () => {
      const { useCase, voteRepository } = makeUseCase({
        vote: {
          findByParkingIdAndUserId: jest
            .fn()
            .mockResolvedValue(makeVote(VoteType.UPVOTE)),
        },
      });

      await expect(
        useCase.execute({ ...validRequest, type: VoteType.UPVOTE }),
      ).rejects.toThrow();

      expect(voteRepository.create).not.toHaveBeenCalled();
      expect(voteRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('resource not found', () => {
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
  });

  describe('parallel fetch', () => {
    it('should fetch user and parking in parallel', async () => {
      const order: string[] = [];
      const { useCase } = makeUseCase({
        user: {
          findById: jest.fn().mockImplementation(() => {
            order.push('user');
            return makeUser();
          }),
        },
        parking: {
          findById: jest.fn().mockImplementation(() => {
            order.push('parking');
            return makeParking();
          }),
        },
      });

      await useCase.execute(validRequest);

      expect(order).toHaveLength(2);
      expect(order).toContain('user');
      expect(order).toContain('parking');
    });
  });
});
