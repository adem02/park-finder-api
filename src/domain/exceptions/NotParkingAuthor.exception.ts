import { DomainException } from './Domain.exception';

export class NotParkingAuthorException extends DomainException {
  constructor(message: string = 'Only the author can delete this parking.') {
    super(message, 403);
  }
}
