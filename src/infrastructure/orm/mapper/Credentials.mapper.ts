import { UserCredentials as DomainUserCredentials } from '../../../domain/entities/UserCredentials';
import { Provider } from '../../../domain/types/auth.types';

interface UserCredentialsModel {
  id: string;
  userId: string;
  provider: Provider;
  providerId: string | null;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
}

export class CredentialsMapper {
  static toDomain(model: UserCredentialsModel) {
    return DomainUserCredentials.reconstitue({
      id: model.id,
      userId: model.userId,
      provider: model.provider,
      providerId: model.providerId ?? undefined,
      passwordHash: model.passwordHash ?? undefined,
      firstName: model.firstName ?? undefined,
      lastName: model.lastName ?? undefined,
      photoUrl: model.photoUrl ?? undefined,
    });
  }
}
