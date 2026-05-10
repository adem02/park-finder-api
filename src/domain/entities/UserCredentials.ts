import { Provider } from '../types/auth.types';
import { InvalidCredentialsException } from '../exceptions/InvalidCredentials.exception';

interface UserCredentialsParams {
  id: string;
  userId: string;
  provider: Provider;
  providerId?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

export class UserCredentials {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly provider: Provider,
    readonly providerId?: string,
    readonly passwordHash?: string,
    readonly firstName?: string,
    readonly lastName?: string,
    readonly photoUrl?: string,
  ) {}

  static create(params: UserCredentialsParams): UserCredentials {
    if (params.provider === 'local' && !params.passwordHash) {
      throw new InvalidCredentialsException(
        'Local provider requires a password hash.',
      );
    }
    if (params.provider !== 'local' && !params.providerId) {
      throw new InvalidCredentialsException(
        'OAuth provider requires a providerId.',
      );
    }

    return new UserCredentials(
      params.id,
      params.userId,
      params.provider,
      params.providerId,
      params.passwordHash,
      params.firstName,
      params.lastName,
      params.photoUrl,
    );
  }
}
