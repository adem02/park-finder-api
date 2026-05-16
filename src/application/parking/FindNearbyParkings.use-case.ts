import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/Parking';
import { PARKING_REPOSITORY } from '../../common/constants/injection-tokens.constants';
import type { ParkingRepository } from '../gateway';
import { CoordinatesVO } from '../../domain/value-objects/Coordinates.vo';
import { NearbyParkLimitByRadius } from '../../domain/constants/parking.constants';
import { ParkingRadius } from '../../domain/types/parking.types';

export interface FindNearbyParkingsRequest {
  radius: ParkingRadius;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface FindNearbyParkingsResponse {
  parkings: Parking[];
}

@Injectable()
export class FindNearbyParkingsUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
  ) {}

  async execute(
    request: FindNearbyParkingsRequest,
  ): Promise<FindNearbyParkingsResponse> {
    const { coordinates, radius } = request;
    const userLocation = CoordinatesVO.create(
      coordinates.latitude,
      coordinates.longitude,
    );

    const nearbyParkings = await this.parkingRepository.findNearBy(
      userLocation,
      {
        radius,
        limit: NearbyParkLimitByRadius(radius),
      },
    );

    return {
      parkings: nearbyParkings,
    };
  }
}
