import { DomainException } from './Domain.exception';

export class WrongEmailOrPasswordException extends DomainException {
  constructor(message: string = 'Wrong email or password') {
    super(message, 401);
  }
}
