import { Inject, Injectable } from '@nestjs/common';
import {
  PARKING_REPOSITORY,
  USER_REPOSITORY,
  VOTE_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  ParkingRepository,
  UserRepository,
  VoteRepository,
} from '../gateway';
import { VoteType } from '../../domain/types/vote.types';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { Vote } from '../../domain/entities/Vote';
import { UuidGenerator } from '../../common/utils/UuidGenerator';
import { POINTS_PER_ACTION } from '../../domain/constants/points.contants';
import { AlreadyVotedException } from '../../domain/exceptions/AlreadyVoted.exception';

export interface VoteRequest {
  type: VoteType;
  userId: string;
  parkingId: string;
}

@Injectable()
export class VoteUseCase {
  constructor(
    @Inject(VOTE_REPOSITORY) private readonly voteRepository: VoteRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PARKING_REPOSITORY) private readonly parkingRepo: ParkingRepository,
  ) {}

  async execute(request: VoteRequest) {
    const { userId, type, parkingId } = request;

    const [user, parking] = await Promise.all([
      this.userRepository.findById(userId),
      this.parkingRepo.findById(parkingId),
    ]);

    if (!user) {
      throw new ResourceNotFoundException(`User with id ${userId} not found`);
    }

    if (!parking) {
      throw new ResourceNotFoundException(
        `Parking with id ${parkingId} not found`,
      );
    }

    const vote = await this.voteRepository.findByParkingIdAndUserId(
      parkingId,
      userId,
    );

    if (!vote) {
      const newVote = Vote.create({
        id: UuidGenerator.Generate(),
        parking,
        votedBy: user,
        voteType: type,
        createdAt: new Date(),
      });
      await this.voteRepository.create(newVote);

      await this.userRepository.updatePointsById(
        userId,
        POINTS_PER_ACTION.VOTE_CAST,
      );

      return;
    }

    if (type === vote.voteType) {
      throw new AlreadyVotedException();
    }

    const updatedVote = vote.change(type);
    await this.voteRepository.update(updatedVote);
  }
}
