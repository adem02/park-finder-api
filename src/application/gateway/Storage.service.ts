import { ParkingPhoto } from '../types/parking.types';

export interface StorageService {
  uploadMany(
    files: ReadonlyArray<ParkingPhoto>,
  ): Promise<ReadonlyArray<string>>;
  deleteMany(photosUrls: ReadonlyArray<string>): Promise<void>;
}
