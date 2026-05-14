import { Parking } from '../entities/Parking';
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
