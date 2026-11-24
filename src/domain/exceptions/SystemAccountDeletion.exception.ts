import { DomainException } from './Domain.exception';

export class SystemAccountDeletionException extends DomainException {
  constructor(message: string = 'The system account cannot be deleted.') {
    super(message, 403);
  }
}
