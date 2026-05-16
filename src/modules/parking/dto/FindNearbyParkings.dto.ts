import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import type { ParkingRadius } from '../../../domain/types/parking.types';
import { PARKING_RADIUS_VALUES } from '../../../domain/constants/parking.constants';
import { FindNearbyParkingsResponse } from '../../../application/parking/FindNearbyParkings.use-case';

export class FindNearbyParkingsQueryDto {
  @IsNumber()
  @Type(() => Number)
  lat!: number;

  @IsNumber()
  @Type(() => Number)
  lng!: number;

  @IsNumber()
  @IsOptional()
  @IsIn(PARKING_RADIUS_VALUES)
  @Type(() => Number)
  radius?: ParkingRadius;
}

export class FindNearbyParkingsOutputDto {
  readonly parkings: Array<{
    id: string;
    name: string;
    totalSpots: number;
    photos: ReadonlyArray<string>;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    createdAt: Date;
  }>;

  constructor(response: FindNearbyParkingsResponse) {
    this.parkings = response.parkings.map((parking) => ({
      id: parking.id,
      name: parking.name,
      totalSpots: parking.totalSpots,
      photos: parking.photos,
      coordinates: {
        latitude: parking.coordinates.latitude,
        longitude: parking.coordinates.longitude,
      },
      createdAt: parking.createdAt,
    }));
  }
}
