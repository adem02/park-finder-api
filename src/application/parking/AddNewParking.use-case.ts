import { Inject, Injectable } from '@nestjs/common';
import {
  PARKING_REPOSITORY,
  STORAGE_SERVICE,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  UserRepository,
  StorageService,
  ParkingRepository,
} from '../gateway';
import { Parking } from '../../domain/entities/Parking';
import { CoordinatesVO } from '../../domain/value-objects/Coordinates.vo';
import { UuidGenerator } from '../../common/utils/UuidGenerator';
import { DUPLICATE_PARKING_RADIUS_METERS } from '../../domain/constants/parking.constants';
import { ParkingAlreadyExistsException } from '../../domain/exceptions/ParkingAlreadyExists.exception';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { ParkingPhoto } from '../types/parking.types';
import { AwardPointsUseCase } from '../points/AwardPoints.use-case';

export interface AddNewParkingUseCaseRequest {
  userId: string;
  name: string;
  totalSpots: number;
  photos: ReadonlyArray<ParkingPhoto>;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface AddNewParkingUseCaseResponse {
  id: string;
}

@Injectable()
export class AddNewParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly awardPointsUseCase: AwardPointsUseCase,
  ) {}

  async execute(
    request: AddNewParkingUseCaseRequest,
  ): Promise<AddNewParkingUseCaseResponse> {
    const coordinates = CoordinatesVO.create(
      request.coordinates.latitude,
      request.coordinates.longitude,
    );

    const [nearByParkings, user] = await Promise.all([
      this.parkingRepository.findNearBy(coordinates, {
        radius: DUPLICATE_PARKING_RADIUS_METERS,
        limit: 1,
      }),
      this.userRepository.findById(request.userId),
    ]);

    if (!user) {
      throw new ResourceNotFoundException(
        `User with ID ${request.userId} not found.`,
      );
    }

    if (nearByParkings.length > 0) {
      throw new ParkingAlreadyExistsException();
    }

    const photoUrls = await this.storageService.uploadMany(request.photos);

    try {
      // Un parking naît sans photo : addPhotos() les rattache et vérifie la limite de 3.
      const newParking = Parking.create({
        id: UuidGenerator.Generate(),
        name: request.name,
        totalSpots: request.totalSpots,
        photos: [],
        coordinates: coordinates,
        addedBy: user,
        createdAt: new Date(),
      }).addPhotos(photoUrls);

      await this.parkingRepository.create(newParking);

      await this.awardPointsUseCase.execute({
        userId: user.id,
        action: 'PARKING_ADDED',
      });

      return { id: newParking.id };
    } catch (error) {
      await this.storageService.deleteMany(photoUrls);
      throw error;
    }
  }
}
