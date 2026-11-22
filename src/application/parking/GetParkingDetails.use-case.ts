import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITY_REPOSITORY,
  COMMENT_REPOSITORY,
  PARKING_REPOSITORY,
  VOTE_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  AvailabilityRepository,
  CommentRepository,
  ParkingRepository,
  VoteRepository,
} from '../gateway';
import { Parking } from '../../domain/entities/Parking';
import { AvailabilityReport } from '../../domain/entities/AvailabilityReport';
import { Vote } from '../../domain/entities/Vote';
import { Comment } from '../../domain/entities/Comment';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { COMMENTS_RECENT_LIMIT } from '../../domain/constants/comment.constants';

export interface GetParkingDetailsRequest {
  id: string;
  userId?: string;
}

export interface GetParkingDetailsResponse {
  parking: Parking;
  latestReport: AvailabilityReport | null;
  votes: Vote[];
  userVote: Vote | null;
  recentComments: Comment[];
}

@Injectable()
export class GetParkingDetailsUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
    @Inject(AVAILABILITY_REPOSITORY)
    private readonly availabilityRepository: AvailabilityRepository,
    @Inject(VOTE_REPOSITORY)
    private readonly voteRepository: VoteRepository,
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: CommentRepository,
  ) {}

  async execute(
    request: GetParkingDetailsRequest,
  ): Promise<GetParkingDetailsResponse> {
    const parking = await this.parkingRepository.findById(request.id);

    if (!parking) {
      throw new ResourceNotFoundException(
        `Parking with id ${request.id} not found.`,
      );
    }

    const [latestReport, votes, userVote, recentComments] = await Promise.all([
      this.availabilityRepository.findLatestByParkingId(request.id),
      this.voteRepository.findByParkingId(request.id),
      request.userId
        ? this.voteRepository.findByParkingIdAndUserId(
            request.id,
            request.userId,
          )
        : Promise.resolve(null),
      this.commentRepository.findRecentByParkingId(
        request.id,
        COMMENTS_RECENT_LIMIT,
      ),
    ]);

    return {
      parking,
      latestReport,
      votes,
      userVote,
      recentComments,
    };
  }
}
