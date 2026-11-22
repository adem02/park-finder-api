import { DomainException } from './Domain.exception';

export class AlreadyVotedException extends DomainException {
  constructor(message: string = 'Already Voted') {
    super(message, 409);
  }
}
