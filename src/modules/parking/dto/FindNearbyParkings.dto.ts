import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import type {
  ParkingRadius,
  ParkingSort,
} from '../../../domain/types/parking.types';
import { PARKING_RADIUS_VALUES } from '../../../domain/constants/parking.constants';
import { FindNearbyParkingsResponse } from '../../../application/parking/FindNearbyParkings.use-case';

const PARKING_SORT_VALUES: ParkingSort[] = ['distance', 'recent', 'popularity'];

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === true || value === 'true' || value === '1' || value === 1) {
    return true;
  }
  if (value === false || value === 'false' || value === '0' || value === 0) {
    return false;
  }
  return value;
};

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

  @ApiProperty({
    required: false,
    example: 0,
    description: 'Minimum number of total spots',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minSpots?: number;

  @ApiProperty({
    required: false,
    example: false,
    description: 'Only return parkings with a recent non-expired report > 0',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  availableOnly?: boolean;

  @ApiProperty({
    required: false,
    example: false,
    description: 'Only return parkings whose vote score is above threshold',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  verifiedOnly?: boolean;

  @ApiProperty({
    required: false,
    enum: PARKING_SORT_VALUES,
    example: 'distance',
    description: 'Sort order (default: distance)',
  })
  @IsOptional()
  @IsIn(PARKING_SORT_VALUES)
  sort?: ParkingSort;
}

class AvailabilityItemDto {
  @ApiProperty({ example: 12, nullable: true })
  availableSpots!: number | null;

  @ApiProperty({ nullable: true, required: false })
  reportedAt!: Date | null;

  @ApiProperty({ example: true })
  isRecent!: boolean;
}

class VotesItemDto {
  @ApiProperty({ example: 12 })
  upvotes!: number;

  @ApiProperty({ example: 2 })
  downvotes!: number;

  @ApiProperty({ example: 10 })
  score!: number;
}

class ParkingItemDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: 'Parking Centrale' })
  name!: string;

  @ApiProperty({ example: 50 })
  totalSpots!: number;

  @ApiProperty({ type: [String] })
  photos!: ReadonlyArray<string>;

  @ApiProperty({
    type: 'object',
    properties: {
      latitude: { type: 'number', example: 48.8566 },
      longitude: { type: 'number', example: 2.3522 },
    },
  })
  coordinates!: { latitude: number; longitude: number };

  @ApiProperty({ example: 245.7, description: 'Distance in meters' })
  distanceMeters!: number;

  @ApiProperty({ type: AvailabilityItemDto })
  availability!: AvailabilityItemDto;

  @ApiProperty({ type: VotesItemDto })
  votes!: VotesItemDto;

  @ApiProperty({ example: false })
  verified!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class FindNearbyParkingsOutputDto {
  @ApiProperty({ type: [ParkingItemDto] })
  readonly parkings: ParkingItemDto[];

  constructor(response: FindNearbyParkingsResponse) {
    this.parkings = response.items.map((item) => {
      const { parking, score, latestReport, distanceMeters } = item;

      const availability =
        latestReport && !latestReport.isExpired
          ? {
              availableSpots: latestReport.availableSpots,
              reportedAt: latestReport.reportedAt,
              isRecent: latestReport.isRecent,
            }
          : {
              availableSpots: null,
              reportedAt: null,
              isRecent: false,
            };

      return {
        id: parking.id,
        name: parking.name,
        totalSpots: parking.totalSpots,
        photos: parking.photos,
        coordinates: {
          latitude: parking.coordinates.latitude,
          longitude: parking.coordinates.longitude,
        },
        distanceMeters,
        availability,
        votes: {
          upvotes: score.upvotes,
          downvotes: score.downvotes,
          score: score.netScore,
        },
        verified: score.isVerified,
        createdAt: parking.createdAt,
      };
    });
  }
}
