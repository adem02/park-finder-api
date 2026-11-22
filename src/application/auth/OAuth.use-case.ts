import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/User';
import { UserCredentials } from '../../domain/entities/UserCredentials';
import { PointsBalanceVO } from '../../domain/value-objects/PointsBalance.vo';
import { UuidGenerator } from '../../common/utils/UuidGenerator';
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../../domain/constants/user.constants';
import {
  APP_LOGGER,
  CREDENTIALS_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type { UserRepository } from '../gateway/User.repository';
import type { CredentialsRepository } from '../gateway/Credentials.repository';
import type { IssuedRefreshToken, AccessToken } from '../types/auth.types';
import { SessionIssuer } from './SessionIssuer';
import type { Logger } from '../../common/interfaces/Logger';

const USERNAME_SUFFIX_ATTEMPTS = 5;

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
  refreshToken: IssuedRefreshToken;
}

@Injectable()
export class OAuthUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(CREDENTIALS_REPOSITORY)
    private readonly credentialsRepository: CredentialsRepository,
    private readonly sessionIssuer: SessionIssuer,
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
      username: await this.uniqueUsername(request),
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

  /**
   * The name-based username may already exist (two "Jean Dupont"): append a short
   * random suffix instead of failing on the unique constraint with a 500.
   */
  private async uniqueUsername(request: OAuthRequest): Promise<string> {
    const base = this.buildUsername(request);
    if (!(await this.userRepository.findByUsername(base))) return base;

    for (let attempt = 0; attempt < USERNAME_SUFFIX_ATTEMPTS; attempt++) {
      const suffix = UuidGenerator.Generate().replace(/-/g, '').slice(0, 6);
      const candidate = `${base.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
      if (!(await this.userRepository.findByUsername(candidate))) {
        return candidate;
      }
    }
    return UuidGenerator.Generate().replace(/-/g, '').slice(0, 12);
  }

  private buildUsername(request: OAuthRequest): string {
    const fromName =
      request.firstName && request.lastName
        ? `${request.firstName}${request.lastName}`
        : null;

    const raw = (fromName ?? request.email?.split('@')[0] ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    return raw.length >= USERNAME_MIN_LENGTH
      ? raw.slice(0, USERNAME_MAX_LENGTH)
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

    const { accessToken, refreshToken } = await this.sessionIssuer.start(
      user.id,
    );
    return { user, accessToken, refreshToken };
  }
}
