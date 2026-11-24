import { Inject, Injectable } from '@nestjs/common';
import {
  LEADERBOARD_REPOSITORY,
  PARKING_PHOTO_REPOSITORY,
  STORAGE_SERVICE,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  LeaderboardRepository,
  ParkingPhotoRepository,
  StorageService,
  UserRepository,
} from '../gateway';
import { getCurrentYearMonth } from '../../domain/types/leaderboard.types';
import { NotPhotoAuthorException } from '../../domain/exceptions/NotPhotoAuthor.exception';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';

export interface RemoveParkingPhotoRequest {
  parkingId: string;
  photoId: string;
  userId: string;
}

/**
 * Whoever posted a photo can take it back. The points it earned are withdrawn (total and the
 * leaderboard of the month it was posted); photos posted with the parking earned none.
 */
@Injectable()
export class RemoveParkingPhotoUseCase {
  constructor(
    @Inject(PARKING_PHOTO_REPOSITORY)
    private readonly parkingPhotoRepository: ParkingPhotoRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(LEADERBOARD_REPOSITORY)
    private readonly leaderboardRepository: LeaderboardRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async execute(request: RemoveParkingPhotoRequest): Promise<void> {
    const photo = await this.parkingPhotoRepository.findById(request.photoId);
    if (!photo || photo.parkingId !== request.parkingId) {
      throw new ResourceNotFoundException(
        `Photo ${request.photoId} not found on parking ${request.parkingId}.`,
      );
    }
    if (photo.addedById !== request.userId) {
      throw new NotPhotoAuthorException();
    }

    await this.parkingPhotoRepository.remove(photo);

    if (photo.awardedPoints > 0) {
      await this.userRepository.withdrawPointsById(
        request.userId,
        photo.awardedPoints,
      );
      await this.leaderboardRepository.withdrawPoints(
        request.userId,
        photo.awardedPoints,
        getCurrentYearMonth(photo.createdAt),
      );
    }

    await this.storageService.deleteMany([photo.url]);
  }
}
