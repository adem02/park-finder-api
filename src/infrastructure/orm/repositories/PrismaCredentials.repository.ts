import { Injectable } from '@nestjs/common';
import { CredentialsRepository } from '../../../application/gateway/Credentials.repository';
import { UserCredentials } from '../../../domain/entities/UserCredentials';
import { Provider } from '../../../domain/types/auth.types';
import { PrismaService } from '../prisma/Prisma.service';
import { CredentialsMapper } from '../mapper/Credentials.mapper';

@Injectable()
export class PrismaCredentialsRepository implements CredentialsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(credentials: UserCredentials): Promise<void> {
    await this.prismaService.userCredentials.create({
      data: {
        id: credentials.id,
        userId: credentials.userId,
        provider: credentials.provider,
        providerId: credentials.providerId,
        passwordHash: credentials.passwordHash,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        photoUrl: credentials.photoUrl,
      },
    });
  }

  async findByUserId(userId: string): Promise<UserCredentials | null> {
    const credentials = await this.prismaService.userCredentials.findUnique({
      where: { userId },
    });

    return credentials ? CredentialsMapper.toDomain(credentials) : null;
  }

  async findByProviderId(
    provider: Provider,
    providerId: string,
  ): Promise<UserCredentials | null> {
    const credentials = await this.prismaService.userCredentials.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });

    return credentials ? CredentialsMapper.toDomain(credentials) : null;
  }

  async findLocalByUserId(userId: string): Promise<UserCredentials | null> {
    const credentials = await this.prismaService.userCredentials.findFirst({
      where: {
        userId,
        provider: 'local',
      },
    });

    return credentials ? CredentialsMapper.toDomain(credentials) : null;
  }
}
