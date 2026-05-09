import { DUPLICATE_PARKING_RADIUS_METERS } from '../constants/coordinates.constants';
import {
  PARKING_NAME_MIN_LENGTH,
  PARKING_TOTAL_SPOTS_MIN,
  PARKING_NAME_MAX_LENGTH,
  PARKING_TOTAL_SPOTS_MAX,
  PARKING_MAX_PHOTOS,
} from '../constants/parking.constants';
import { CoordinatesVO } from '../value-objects/Coordinates.vo';
import { User } from './User';
import { InvalidParkingNameLengthException } from '../exceptions/InvalidParkingNameLength.exception';
import { InvalidParkingTotalSpotsException } from '../exceptions/InvalidParkingTotalSpots.exception';
import { ParkingPhotosMaxLengthExceededException } from '../exceptions/ParkingPhotosMaxLengthExceeded.exception';

interface ParkingParams {
  id: string;
  name: string;
  totalSpots: number;
  photos: ReadonlyArray<string>;
  coordinates: CoordinatesVO;
  addedBy: User;
  createdAt: Date;
  updatedAt?: Date;
}

export class Parking {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly totalSpots: number,
    readonly photos: ReadonlyArray<string>,
    readonly coordinates: CoordinatesVO,
    readonly addedBy: User,
    readonly createdAt: Date,
    readonly updatedAt?: Date,
  ) {}

  static create(params: ParkingParams) {
    if (
      params.name.length < PARKING_NAME_MIN_LENGTH ||
      params.name.length > PARKING_NAME_MAX_LENGTH
    ) {
      throw new InvalidParkingNameLengthException(
        'Parking name length must be between 3 to 100 characters long.',
      );
    }

    if (
      params.totalSpots < PARKING_TOTAL_SPOTS_MIN ||
      params.totalSpots > PARKING_TOTAL_SPOTS_MAX
    ) {
      throw new InvalidParkingTotalSpotsException(
        'Total spots number must be between 1 and 1000.',
      );
    }

    if (params.photos.length > PARKING_MAX_PHOTOS) {
      throw new ParkingPhotosMaxLengthExceededException(
        'A parking can have a maximum of 3 photos.',
      );
    }

    return new Parking(
      params.id,
      params.name,
      params.totalSpots,
      params.photos,
      params.coordinates,
      params.addedBy,
      params.createdAt,
      params.updatedAt,
    );
  }

  /**
   * Returns true if the given coordinates are within 50 meters of this parking.
   * Used to detect duplicate parkings.
   */
  isNearTo(other: CoordinatesVO): boolean {
    return this.coordinates.distanceTo(other) < DUPLICATE_PARKING_RADIUS_METERS;
  }
}
