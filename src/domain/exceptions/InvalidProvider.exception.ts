import { DomainException } from './Domain.exception';

export class InvalidProviderException extends DomainException {
  constructor(message: string = 'Invalid Provider') {
    super(message, 401);
  }
}
