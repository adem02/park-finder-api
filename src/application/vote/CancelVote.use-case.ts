import { Inject, Injectable } from '@nestjs/common';
import { VOTE_REPOSITORY } from '../../common/constants/injection-tokens.constants';
import type { VoteRepository } from '../gateway';

export interface CancelVoteRequest {
  parkingId: string;
  userId: string;
}

@Injectable()
export class CancelVoteUseCase {
  constructor(
    @Inject(VOTE_REPOSITORY) private voteRepository: VoteRepository,
  ) {}

  async execute(request: CancelVoteRequest) {
    await this.voteRepository.cancelByParkingIdAndUserId(
      request.parkingId,
      request.userId,
    );
  }
}
