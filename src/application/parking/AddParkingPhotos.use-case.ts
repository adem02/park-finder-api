import { Inject, Injectable } from '@nestjs/common';
import {
  PARKING_PHOTO_REPOSITORY,
  PARKING_REPOSITORY,
  STORAGE_SERVICE,
} from '../../common/constants/injection-tokens.constants';
import type {
  ParkingPhotoRepository,
  ParkingRepository,
  StorageService,
} from '../gateway';
import { ParkingPhoto } from '../types/parking.types';
import { AwardPointsUseCase } from '../points/AwardPoints.use-case';
import { UuidGenerator } from '../../common/utils/UuidGenerator';
import { PARKING_MAX_PHOTOS } from '../../domain/constants/parking.constants';
import { POINTS_PER_ACTION } from '../../domain/constants/points.constants';
import { NoPhotoProvidedException } from '../../domain/exceptions/NoPhotoProvided.exception';
import { ParkingPhotosFullException } from '../../domain/exceptions/ParkingPhotosFull.exception';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';

export interface AddParkingPhotosRequest {
  parkingId: string;
  userId: string;
  photos: ReadonlyArray<ParkingPhoto>;
}

export interface AddParkingPhotosResponse {
  photos: { id: string; url: string }[];
}

/**
 * Any signed-in user adds photos to an existing parking, up to 3 in all. Each photo is worth
 * 5 points, recorded on it so that removing it takes back exactly that.
 */
@Injectable()
export class AddParkingPhotosUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
    @Inject(PARKING_PHOTO_REPOSITORY)
    private readonly parkingPhotoRepository: ParkingPhotoRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    private readonly awardPointsUseCase: AwardPointsUseCase,
  ) {}

  async execute(
    request: AddParkingPhotosRequest,
  ): Promise<AddParkingPhotosResponse> {
    if (request.photos.length === 0) throw new NoPhotoProvidedException();

    const parking = await this.parkingRepository.findById(request.parkingId);
    if (!parking) {
      throw new ResourceNotFoundException(
        `Parking with ID ${request.parkingId} not found.`,
      );
    }
    // Checked before uploading, then again atomically when saving (two people at once).
    if (parking.photos.length + request.photos.length > PARKING_MAX_PHOTOS) {
      throw new ParkingPhotosFullException();
    }

    const urls = await this.storageService.uploadMany(request.photos);
    const now = new Date();
    const records = urls.map((url) => ({
      id: UuidGenerator.Generate(),
      parkingId: parking.id,
      url,
      addedById: request.userId,
      awardedPoints: POINTS_PER_ACTION.PHOTO_ADDED,
      createdAt: now,
    }));

    const added = await this.parkingPhotoRepository.add(
      parking.id,
      records,
      PARKING_MAX_PHOTOS,
    );
    if (!added) {
      await this.storageService.deleteMany(urls);
      throw new ParkingPhotosFullException();
    }

    for (let i = 0; i < records.length; i++) {
      await this.awardPointsUseCase.execute({
        userId: request.userId,
        action: 'PHOTO_ADDED',
      });
    }

    return { photos: records.map(({ id, url }) => ({ id, url })) };
  }
}
