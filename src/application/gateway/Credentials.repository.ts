import { UserCredentials } from '../../domain/entities/UserCredentials';
import { Provider } from '../../domain/types/auth.types';

export interface CredentialsRepository {
  findByUserId(userId: string): Promise<UserCredentials[]>;
  findByProviderId(
    provider: Provider,
    providerId: string,
  ): Promise<UserCredentials | null>;
  findLocalByUserId(userId: string): Promise<UserCredentials | null>;
  create(credentials: UserCredentials): Promise<void>;
}
