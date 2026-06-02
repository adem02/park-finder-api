import { Inject, Injectable } from '@nestjs/common';
import {
  COMMENT_REPOSITORY,
  PARKING_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type { CommentRepository, ParkingRepository } from '../gateway';
import { CommentCursor } from '../gateway/Comment.repository';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { Comment } from '../../domain/entities/Comment';
import {
  COMMENTS_PAGE_DEFAULT_LIMIT,
  COMMENTS_PAGE_MAX_LIMIT,
} from '../../domain/constants/comment.constants';

export interface ListParkingCommentsRequest {
  parkingId: string;
  cursor?: CommentCursor | null;
  limit?: number;
}

export interface ListParkingCommentsResponse {
  items: Comment[];
  nextCursor: CommentCursor | null;
}

@Injectable()
export class ListParkingCommentsUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: CommentRepository,
  ) {}

  async execute(
    request: ListParkingCommentsRequest,
  ): Promise<ListParkingCommentsResponse> {
    const parking = await this.parkingRepository.findById(request.parkingId);

    if (!parking) {
      throw new ResourceNotFoundException(
        `Parking with id ${request.parkingId} not found.`,
      );
    }

    const limit = this.normalizeLimit(request.limit);

    const results = await this.commentRepository.findPageByParkingId(
      request.parkingId,
      request.cursor ?? null,
      limit + 1,
    );

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? { createdAt: last.createdAt, id: last.id } : null;

    return { items, nextCursor };
  }

  private normalizeLimit(requested?: number): number {
    if (!requested || requested <= 0) {
      return COMMENTS_PAGE_DEFAULT_LIMIT;
    }
    return Math.min(requested, COMMENTS_PAGE_MAX_LIMIT);
  }
}
