import { DomainException } from './Domain.exception';

/** Another parking is already registered within the duplicate radius. */
export class ParkingAlreadyExistsException extends DomainException {
  constructor(
    message: string = 'A parking already exists near the provided coordinates.',
  ) {
    super(message, 409);
  }
}
