import { DomainException } from './Domain.exception';

export class NoPhotoProvidedException extends DomainException {
  constructor(message: string = 'At least one photo is required.') {
    super(message, 400);
  }
}
