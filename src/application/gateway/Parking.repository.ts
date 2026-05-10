import { CoordinatesVO } from '../../domain/value-objects/Coordinates.vo';
import { Parking } from '../../domain/entities/Parking';
import {
  FindNearByOptions,
  ParkingWithScore,
} from '../../domain/types/parking.types';

export interface ParkingRepository {
  findNearBy(
    coordinates: CoordinatesVO,
    options?: FindNearByOptions,
  ): Promise<Parking[]>;
  findById(id: string): Promise<Parking | null>;
  create(parking: Parking): Promise<void>;
  updateById(id: string, updatedParking: Parking): Promise<void>;
  findByUserId(userId: string): Promise<ParkingWithScore[]>;
  deleteById(id: string): Promise<void>;
}
