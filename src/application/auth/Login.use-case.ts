import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/User';
import type { IssuedRefreshToken, AccessToken } from '../types/auth.types';
import { SessionIssuer } from './SessionIssuer';
import {
  CREDENTIALS_REPOSITORY,
  PASSWORD_SERVICE,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type { CredentialsRepository } from '../gateway/Credentials.repository';
import type { UserRepository } from '../gateway/User.repository';
import { WrongEmailOrPasswordException } from '../../domain/exceptions/WrongEmailOrPassword.exception';
import { InvalidProviderException } from '../../domain/exceptions/InvalidProvider.exception';
import type { PasswordService } from '../gateway/Password.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: AccessToken;
  refreshToken: IssuedRefreshToken;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(CREDENTIALS_REPOSITORY)
    private readonly credentialsRepository: CredentialsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly sessionIssuer: SessionIssuer,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService,
  ) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(request.email);

    if (!user) {
      throw new WrongEmailOrPasswordException();
    }

    const credentials = await this.credentialsRepository.findLocalByUserId(
      user.id,
    );

    if (!credentials || credentials.provider !== 'local') {
      throw new InvalidProviderException('Failed Login user');
    }

    if (!credentials.passwordHash) {
      throw new Error(
        'Corrupted credentials: missing password hash for local provider',
      );
    }

    const isMatch = await this.passwordService.compare(
      request.password,
      credentials.passwordHash,
    );

    if (!isMatch) {
      throw new WrongEmailOrPasswordException();
    }

    const { accessToken, refreshToken } = await this.sessionIssuer.start(
      user.id,
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}
