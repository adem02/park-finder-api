import { DomainException } from './Domain.exception';

/** Other users voted, commented or reported on it: the parking now belongs to the community. */
export class ParkingHasContributionsException extends DomainException {
  constructor(
    message: string = 'Other users have contributed to this parking: it can no longer be deleted.',
  ) {
    super(message, 409);
  }
}
