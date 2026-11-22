import { Inject, Injectable } from '@nestjs/common';
import {
  COMMENT_REPOSITORY,
  PARKING_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  CommentRepository,
  ParkingRepository,
  UserRepository,
} from '../gateway';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { Comment } from '../../domain/entities/Comment';
import { UuidGenerator } from '../../common/utils/UuidGenerator';

export interface CommentParkingRequest {
  userId: string;
  parkingId: string;
  content: string;
}

@Injectable()
export class CommentParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: CommentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(request: CommentParkingRequest): Promise<void> {
    const { userId, parkingId, content } = request;

    const [user, parking] = await Promise.all([
      this.userRepository.findById(userId),
      this.parkingRepository.findById(parkingId),
    ]);

    if (!user) {
      throw new ResourceNotFoundException(`User with id: ${userId} not found`);
    }

    if (!parking) {
      throw new ResourceNotFoundException(
        `Parking with id: ${parkingId} not found`,
      );
    }

    const newComment = Comment.create({
      id: UuidGenerator.Generate(),
      content,
      parking,
      author: user,
      createdAt: new Date(),
    });

    await this.commentRepository.create(newComment);
  }
}
