import { Inject, Injectable } from '@nestjs/common';
import { PARKING_REPOSITORY } from '../../common/constants/injection-tokens.constants';
import type { ParkingRepository } from '../gateway';
import { CoordinatesVO } from '../../domain/value-objects/Coordinates.vo';
import { NearbyParkLimitByRadius } from '../../domain/constants/parking.constants';
import {
  NearbyParkingItem,
  ParkingRadius,
  ParkingSort,
} from '../../domain/types/parking.types';

export interface FindNearbyParkingsRequest {
  radius: ParkingRadius;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  minSpots?: number;
  availableOnly?: boolean;
  verifiedOnly?: boolean;
  sort?: ParkingSort;
}

export interface FindNearbyParkingsResponse {
  items: NearbyParkingItem[];
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
    const {
      coordinates,
      radius,
      minSpots,
      availableOnly,
      verifiedOnly,
      sort = 'distance',
    } = request;

    const userLocation = CoordinatesVO.create(
      coordinates.latitude,
      coordinates.longitude,
    );

    const items = await this.parkingRepository.findNearByWithDetails(
      userLocation,
      {
        radius,
        limit: NearbyParkLimitByRadius(radius),
      },
    );

    const filtered = items.filter((item) => {
      if (minSpots !== undefined && item.parking.totalSpots < minSpots) {
        return false;
      }
      if (availableOnly) {
        const report = item.latestReport;
        if (!report || report.isExpired || report.availableSpots <= 0) {
          return false;
        }
      }
      if (verifiedOnly && !item.score.isVerified) {
        return false;
      }
      return true;
    });

    const sorted = this.sortItems(filtered, sort);

    return { items: sorted };
  }

  private sortItems(
    items: NearbyParkingItem[],
    sort: ParkingSort,
  ): NearbyParkingItem[] {
    if (sort === 'distance') {
      return [...items].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    if (sort === 'recent') {
      return [...items].sort(
        (a, b) => b.parking.createdAt.getTime() - a.parking.createdAt.getTime(),
      );
    }
    return [...items].sort((a, b) => b.score.netScore - a.score.netScore);
  }
}
