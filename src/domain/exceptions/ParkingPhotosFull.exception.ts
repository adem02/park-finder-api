import { DomainException } from './Domain.exception';

/** The parking already has the maximum number of photos (3). */
export class ParkingPhotosFullException extends DomainException {
  constructor(
    message: string = 'This parking already has the maximum number of photos.',
  ) {
    super(message, 409);
  }
}
