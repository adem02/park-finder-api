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
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { ParkingPhoto } from '../types/parking.types';

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
  ) {}

  async execute(
    request: AddNewParkingUseCaseRequest,
  ): Promise<AddNewParkingUseCaseResponse> {
    const coordinates = CoordinatesVO.create(
      request.coordinates.latitude,
      request.coordinates.longitude,
    );

    const [nearByParkings, user] = await Promise.all([
      this.parkingRepository.findNearBy(coordinates, { radius: 50, limit: 1 }),
      this.userRepository.findById(request.userId),
    ]);

    if (!user) {
      throw new ResourceNotFoundException(
        `User with ID ${request.userId} not found.`,
      );
    }

    if (nearByParkings.length > 0) {
      throw new ResourceNotFoundException(
        'A parking already exists near the provided coordinates.',
      );
    }

    const photoUrls = await this.storageService.uploadMany(request.photos);

    try {
      const newParking = Parking.create({
        id: UuidGenerator.Generate(),
        name: request.name,
        totalSpots: request.totalSpots,
        photos: photoUrls,
        coordinates: coordinates,
        addedBy: user,
        createdAt: new Date(),
      });

      await this.parkingRepository.create(newParking);

      return { id: newParking.id };
    } catch (error) {
      await this.storageService.deleteMany(photoUrls);
      throw error;
    }
  }
}
