import { DomainException } from './Domain.exception';

export class NotPhotoAuthorException extends DomainException {
  constructor(
    message: string = 'Only the person who posted this photo can remove it.',
  ) {
    super(message, 403);
  }
}
