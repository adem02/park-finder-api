import { ParkingPhotoRecord } from '../../domain/types/parking-photo.types';

export interface ParkingPhotoRepository {
  /** In display order (the parking's photo list). */
  findByParkingId(parkingId: string): Promise<ParkingPhotoRecord[]>;
  findById(id: string): Promise<ParkingPhotoRecord | null>;
  /**
   * Appends photos to the parking, atomically: the parking row is locked, and nothing is added
   * (returns false) if that would go over `maxPhotos`.
   */
  add(
    parkingId: string,
    photos: ReadonlyArray<ParkingPhotoRecord>,
    maxPhotos: number,
  ): Promise<boolean>;
  /** Removes the photo from the ledger and from the parking's photo list. */
  remove(photo: ParkingPhotoRecord): Promise<void>;
}
