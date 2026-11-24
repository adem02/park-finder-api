import { Inject, Injectable } from '@nestjs/common';
import {
  LEADERBOARD_REPOSITORY,
  PARKING_REPOSITORY,
  STORAGE_SERVICE,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  LeaderboardRepository,
  ParkingRepository,
  StorageService,
  UserRepository,
} from '../gateway';
import { POINTS_PER_ACTION } from '../../domain/constants/points.constants';
import { getCurrentYearMonth } from '../../domain/types/leaderboard.types';
import { NotParkingAuthorException } from '../../domain/exceptions/NotParkingAuthor.exception';
import { ParkingHasContributionsException } from '../../domain/exceptions/ParkingHasContributions.exception';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';

export interface DeleteParkingRequest {
  parkingId: string;
  userId: string;
}

/**
 * The author takes back a parking (typo, duplicate...) as long as nobody else contributed to it:
 * once others voted, commented or reported, it belongs to the community. The points earned for
 * adding it are withdrawn (total and the leaderboard of the month it was added), so adding then
 * deleting earns nothing. Badges already earned stay. Photos are removed from storage last, best effort.
 */
@Injectable()
export class DeleteParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(LEADERBOARD_REPOSITORY)
    private readonly leaderboardRepository: LeaderboardRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async execute(request: DeleteParkingRequest): Promise<void> {
    const parking = await this.parkingRepository.findById(request.parkingId);
    if (!parking) {
      throw new ResourceNotFoundException(
        `Parking with ID ${request.parkingId} not found.`,
      );
    }

    if (parking.addedBy.id !== request.userId) {
      throw new NotParkingAuthorException();
    }

    const contributed = await this.parkingRepository.hasContributionsFromOthers(
      parking.id,
      request.userId,
    );
    if (contributed) {
      throw new ParkingHasContributionsException();
    }

    await this.parkingRepository.deleteById(parking.id);

    const points = POINTS_PER_ACTION.PARKING_ADDED;
    await this.userRepository.withdrawPointsById(request.userId, points);
    await this.leaderboardRepository.withdrawPoints(
      request.userId,
      points,
      getCurrentYearMonth(parking.createdAt),
    );

    await this.storageService.deleteMany(parking.photos);
  }
}
