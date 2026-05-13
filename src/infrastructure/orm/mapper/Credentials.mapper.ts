import { UserCredentials as DomainUserCredentials } from '../../../domain/entities/UserCredentials';
import { UserCredentials as ModelUserCredentials } from '../prisma/generated/client';

export class CredentialsMapper {
  static toDomain(model: ModelUserCredentials) {
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
