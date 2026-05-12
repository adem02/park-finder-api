import { DomainException } from './Domain.exception';

export class EmailAlreadyInUseException extends DomainException {
  constructor(message: string = 'Email Already in Use') {
    super(message, 409);
  }
}
