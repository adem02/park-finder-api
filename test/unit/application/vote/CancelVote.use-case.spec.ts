import { CancelVoteUseCase } from '../../../../src/application/vote/CancelVote.use-case';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';
import type { VoteRepository } from '../../../../src/application/gateway';

const makeVoteRepository = (
  overrides: Partial<jest.Mocked<VoteRepository>> = {},
): jest.Mocked<VoteRepository> => ({
  findByParkingIdAndUserId: jest.fn(),
  findByParkingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  cancelByParkingIdAndUserId: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeUseCase = (overrides: Partial<jest.Mocked<VoteRepository>> = {}) => {
  const voteRepository = makeVoteRepository(overrides);
  const useCase = new CancelVoteUseCase(voteRepository);
  return { useCase, voteRepository };
};

const validRequest = { parkingId: 'parking-1', userId: 'user-1' };

describe('CancelVoteUseCase', () => {
  describe('execute', () => {
    it('should call cancelByParkingIdAndUserId with correct ids', async () => {
      const { useCase, voteRepository } = makeUseCase();

      await useCase.execute(validRequest);

      expect(voteRepository.cancelByParkingIdAndUserId).toHaveBeenCalledWith(
        validRequest.parkingId,
        validRequest.userId,
      );
    });

    it('should propagate ResourceNotFoundException when vote does not exist', async () => {
      const { useCase } = makeUseCase({
        cancelByParkingIdAndUserId: jest
          .fn()
          .mockRejectedValue(new ResourceNotFoundException('Vote not found')),
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should propagate unexpected errors from the repository', async () => {
      const { useCase } = makeUseCase({
        cancelByParkingIdAndUserId: jest
          .fn()
          .mockRejectedValue(new Error('DB error')),
      });

      await expect(useCase.execute(validRequest)).rejects.toThrow('DB error');
    });
  });
});
