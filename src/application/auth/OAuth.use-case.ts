import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/User';
import { UserCredentials } from '../../domain/entities/UserCredentials';
import { PointsBalanceVO } from '../../domain/value-objects/PointsBalance.vo';
import { UuidGenerator } from '../../common/utils/UuidGenerator';
import {
  APP_LOGGER,
  CREDENTIALS_REPOSITORY,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type { UserRepository } from '../gateway/User.repository';
import type { CredentialsRepository } from '../gateway/Credentials.repository';
import type { TokenService } from '../gateway/Token.service';
import type { AccessToken } from '../types/auth.types';
import type { Logger } from '../../common/interfaces/Logger';

export interface OAuthRequest {
  provider: 'google' | 'apple';
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

export interface OAuthResponse {
  user: User;
  accessToken: AccessToken;
}

@Injectable()
export class OAuthUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(CREDENTIALS_REPOSITORY)
    private readonly credentialsRepository: CredentialsRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(APP_LOGGER)
    private readonly logger: Logger,
  ) {}

  private async findExistingUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.error(
        `Data inconsistency: credentials exist for userId ${userId} but user not found`,
      );
      throw new Error('User not found for existing OAuth credentials');
    }
    return user;
  }

  private async createUserFromOAuth(request: OAuthRequest): Promise<User> {
    const user = User.create({
      id: UuidGenerator.Generate(),
      username: this.buildUsername(request),
      pointsBalance: PointsBalanceVO.create(0),
      createdAt: new Date(),
      email: request.email,
      photoUrl: request.photoUrl,
    });
    await this.userRepository.create(user);

    const credentials = UserCredentials.create({
      id: UuidGenerator.Generate(),
      userId: user.id,
      provider: request.provider,
      providerId: request.providerId,
      firstName: request.firstName,
      lastName: request.lastName,
      photoUrl: request.photoUrl,
    });
    await this.credentialsRepository.create(credentials);

    return user;
  }

  private buildUsername(request: OAuthRequest): string {
    const fromName =
      request.firstName && request.lastName
        ? `${request.firstName}${request.lastName}`
        : null;

    const raw = (fromName ?? request.email?.split('@')[0] ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    return raw.length >= 3
      ? raw.slice(0, 50)
      : UuidGenerator.Generate().slice(0, 8);
  }

  async execute(request: OAuthRequest): Promise<OAuthResponse> {
    const existing = await this.credentialsRepository.findByProviderId(
      request.provider,
      request.providerId,
    );

    const user = existing
      ? await this.findExistingUser(existing.userId)
      : await this.createUserFromOAuth(request);

    const accessToken = await this.tokenService.sign(user.id);
    return { user, accessToken };
  }
}
