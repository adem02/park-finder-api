import { ParkingRadius } from '../types/parking.types';

export const PARKING_NAME_MIN_LENGTH = 3;
export const PARKING_NAME_MAX_LENGTH = 100;
export const PARKING_TOTAL_SPOTS_MIN = 1;
export const PARKING_TOTAL_SPOTS_MAX = 1000;
export const PARKING_MAX_PHOTOS = 3;
export const MODERATION_THRESHOLD = -5;
export const VERIFIED_THRESHOLD = 10;
export const PARKING_RADIUS_VALUES: ParkingRadius[] = [
  500, 1000, 2000, 5000, 10000,
];

export const NearbyParkLimitByRadius = (radius: ParkingRadius): number => {
  switch (radius) {
    case 500:
      return 10;
    case 1000:
      return 15;
    case 2000:
      return 20;
    case 5000:
      return 50;
    case 10000:
      return 100;
  }
};
