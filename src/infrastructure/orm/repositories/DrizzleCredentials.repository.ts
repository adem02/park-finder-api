import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { CredentialsRepository } from '../../../application/gateway/Credentials.repository';
import { UserCredentials } from '../../../domain/entities/UserCredentials';
import { Provider } from '../../../domain/types/auth.types';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { userCredentials } from '../drizzle/schema';
import { CredentialsMapper } from '../mapper/Credentials.mapper';

@Injectable()
export class DrizzleCredentialsRepository implements CredentialsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(credentials: UserCredentials): Promise<void> {
    await this.drizzleService.db.insert(userCredentials).values({
      id: credentials.id,
      userId: credentials.userId,
      provider: credentials.provider,
      providerId: credentials.providerId,
      passwordHash: credentials.passwordHash,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      photoUrl: credentials.photoUrl,
    });
  }

  async findByUserId(userId: string): Promise<UserCredentials | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, userId))
      .limit(1);

    return row ? CredentialsMapper.toDomain(row) : null;
  }

  async findByProviderId(
    provider: Provider,
    providerId: string,
  ): Promise<UserCredentials | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.provider, provider),
          eq(userCredentials.providerId, providerId),
        ),
      )
      .limit(1);

    return row ? CredentialsMapper.toDomain(row) : null;
  }

  async findLocalByUserId(userId: string): Promise<UserCredentials | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.provider, 'local'),
        ),
      )
      .limit(1);

    return row ? CredentialsMapper.toDomain(row) : null;
  }
}
