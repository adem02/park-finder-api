import { randomUUID } from 'node:crypto';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { userCredentials } from '../../../../src/infrastructure/orm/drizzle/schema';
import { UserBuilder } from './user.builder';

export type CredentialsProvider = 'local' | 'google' | 'apple';

export interface UserCredentialsRow {
  id: string;
  userId: string;
  provider: CredentialsProvider;
  providerId: string | null;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
}

/**
 * Builder for the `user_credentials` table. Auto-creates a default User via
 * UserBuilder if `.forUser()` isn't called explicitly.
 */
export class UserCredentialsBuilder {
  private row: UserCredentialsRow;

  constructor(private readonly drizzleService: DrizzleService) {
    this.row = {
      id: randomUUID(),
      userId: '',
      provider: 'local',
      providerId: null,
      passwordHash: '$2b$10$fakeHashFakeHashFakeHashFakeHashFa',
      firstName: 'Test',
      lastName: 'User',
      photoUrl: null,
    };
  }

  forUser(userId: string): this {
    this.row.userId = userId;
    return this;
  }

  withProvider(provider: CredentialsProvider): this {
    this.row.provider = provider;
    return this;
  }

  withProviderId(providerId: string | null): this {
    this.row.providerId = providerId;
    return this;
  }

  withPasswordHash(passwordHash: string | null): this {
    this.row.passwordHash = passwordHash;
    return this;
  }

  build(): UserCredentialsRow {
    return { ...this.row };
  }

  async create(): Promise<UserCredentialsRow> {
    if (!this.row.userId) {
      const user = await new UserBuilder(this.drizzleService).create();
      this.row.userId = user.id;
    }
    await this.drizzleService.db.insert(userCredentials).values(this.row);
    return this.build();
  }
}
