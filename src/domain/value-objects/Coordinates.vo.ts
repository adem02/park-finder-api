import {
  EARTH_RADIUS_METERS,
  TO_RADIANS,
  VALID_COORDINATES,
} from '../constants/coordinates.constants';
import { InvalidCoordinatesException } from '../exceptions/InvalidCoordinates.exception';

export class CoordinatesVO {
  private constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {}

  static create(latitude: number, longitude: number): CoordinatesVO {
    if (
      latitude < VALID_COORDINATES.minLat ||
      latitude > VALID_COORDINATES.maxLat
    ) {
      throw new InvalidCoordinatesException(
        'Invalid latitude number. Must be between -90 and 90',
      );
    }
    if (
      longitude < VALID_COORDINATES.minLng ||
      longitude > VALID_COORDINATES.maxLng
    ) {
      throw new InvalidCoordinatesException(
        'Invalid longitude number. Must be between -180 and 180',
      );
    }

    return new CoordinatesVO(latitude, longitude);
  }

  /**
   * Returns the distance in meters between two coordinates using the Haversine formula.
   */
  distanceTo(other: CoordinatesVO): number {
    const latitudeDistance = (other.latitude - this.latitude) * TO_RADIANS;
    const longitudeDistance = (other.longitude - this.longitude) * TO_RADIANS;

    const originLatRad = this.latitude * TO_RADIANS;
    const targetLatRad = other.latitude * TO_RADIANS;

    const haversineLatitude =
      Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2);

    const haversineLongitude =
      Math.sin(longitudeDistance / 2) * Math.sin(longitudeDistance / 2);

    const angularDistance =
      haversineLatitude +
      Math.cos(originLatRad) * Math.cos(targetLatRad) * haversineLongitude;

    const centralAngle =
      2 *
      Math.atan2(Math.sqrt(angularDistance), Math.sqrt(1 - angularDistance));

    return EARTH_RADIUS_METERS * centralAngle;
  }
}
