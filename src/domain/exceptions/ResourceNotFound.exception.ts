import { DomainException } from './Domain.exception';

export class ResourceNotFoundException extends DomainException {
  constructor(message: string = 'Resource not found', statusCode = 404) {
    super(message, statusCode);
  }
}
