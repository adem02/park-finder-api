import { Injectable } from '@nestjs/common';
import { CredentialsRepository } from '../../application/gateway/Credentials.repository';
import { UserCredentials } from '../../domain/entities/UserCredentials';
import { Provider } from '../../domain/types/auth.types';

@Injectable()
export class PrismaCredentialsRepository implements CredentialsRepository {
  private usersCredentials: UserCredentials[] = [];

  create(credentials: UserCredentials): Promise<void> {
    this.usersCredentials.push(credentials);

    return new Promise((resolve) => resolve());
  }

  findByUserId(userId: string): Promise<UserCredentials | null> {
    const credentials = this.usersCredentials.find(
      (credentials) => credentials.userId === userId,
    );

    return Promise.resolve(credentials ?? null);
  }
  findByProviderId(
    provider: Provider,
    providerId: string,
  ): Promise<UserCredentials | null> {
    const credentials = this.usersCredentials.find(
      (credentials) =>
        credentials.provider === provider &&
        credentials.providerId === providerId,
    );

    return Promise.resolve(credentials ?? null);
  }
  findLocalByUserId(_userId: string): Promise<UserCredentials | null> {
    throw new Error('Method not implemented.');
  }
}
