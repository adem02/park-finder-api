import { Parking } from '../entities/Parking';
import { AvailabilityReport } from '../entities/AvailabilityReport';
import { ParkingScoreVO } from '../value-objects/ParkingScore.vo';

export interface FindNearByOptions {
  radius?: number;
  available?: boolean;
  minSpots?: number;
  verified?: boolean;
  limit?: number;
}

export interface ParkingWithScore {
  parking: Parking;
  score: ParkingScoreVO;
  votesCount: number;
}

export interface NearbyParkingItem {
  parking: Parking;
  score: ParkingScoreVO;
  latestReport: AvailabilityReport | null;
  distanceMeters: number;
}

export type ParkingRadius = 500 | 1000 | 2000 | 5000 | 10000;

export type ParkingSort = 'distance' | 'recent' | 'popularity';
