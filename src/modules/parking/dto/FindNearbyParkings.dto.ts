import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import type { ParkingRadius } from '../../../domain/types/parking.types';
import { PARKING_RADIUS_VALUES } from '../../../domain/constants/parking.constants';
import { FindNearbyParkingsResponse } from '../../../application/parking/FindNearbyParkings.use-case';

export class FindNearbyParkingsQueryDto {
  @ApiProperty({ example: 48.8566, description: 'Latitude' })
  @IsNumber()
  @Type(() => Number)
  lat!: number;

  @ApiProperty({ example: 2.3522, description: 'Longitude' })
  @IsNumber()
  @Type(() => Number)
  lng!: number;

  @ApiProperty({
    required: false,
    enum: PARKING_RADIUS_VALUES,
    example: 500,
    description: 'Search radius in meters (default: 500)',
  })
  @IsNumber()
  @IsOptional()
  @IsIn(PARKING_RADIUS_VALUES)
  @Type(() => Number)
  radius?: ParkingRadius;
}

class ParkingItemDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({ example: 'Parking Centrale' })
  name: string;

  @ApiProperty({ example: 50 })
  totalSpots: number;

  @ApiProperty({ type: [String] })
  photos: ReadonlyArray<string>;

  @ApiProperty({
    type: 'object',
    properties: {
      latitude: { type: 'number', example: 48.8566 },
      longitude: { type: 'number', example: 2.3522 },
    },
  })
  coordinates: { latitude: number; longitude: number };

  @ApiProperty()
  createdAt: Date;
}

export class FindNearbyParkingsOutputDto {
  @ApiProperty({ type: [ParkingItemDto] })
  readonly parkings: ParkingItemDto[];

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
