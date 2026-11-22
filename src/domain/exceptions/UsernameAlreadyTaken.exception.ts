import { DomainException } from './Domain.exception';

export class UsernameAlreadyTakenException extends DomainException {
  constructor(message: string = 'Username already taken') {
    super(message, 409);
  }
}
