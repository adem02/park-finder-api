import { DomainException } from './Domain.exception';

export class InvalidRefreshTokenException extends DomainException {
  constructor(message: string = 'Invalid or expired refresh token') {
    super(message, 401);
  }
}
