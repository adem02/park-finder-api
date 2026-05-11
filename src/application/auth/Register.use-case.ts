import { Inject, Injectable } from '@nestjs/common';
import {
  CREDENTIALS_REPOSITORY,
  PASSWORD_SERVICE,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type { UserRepository } from '../gateway/User.repository';
import { PointsBalanceVO } from '../../domain/value-objects/PointsBalance.vo';
import type { CredentialsRepository } from '../gateway/Credentials.repository';
import type { TokenService } from '../gateway/Token.service';
import { User } from '../../domain/entities/User';
import { UuidGenerator } from '../../common/utils/UuidGenerator';
import { UserCredentials } from '../../domain/entities/UserCredentials';
import type { AccessToken } from '../types/auth.types';
import { EmailAlreadyInUseException } from '../../domain/exceptions/EmailAlreadyInUse.exception';
import type { PasswordService } from '../gateway/Password.service';

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: AccessToken;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(CREDENTIALS_REPOSITORY)
    private readonly credentialsRepository: CredentialsRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService,
  ) {}

  async execute(request: RegisterRequest): Promise<RegisterResponse> {
    const user = await this.userRepository.findByEmail(request.email);

    if (user) {
      throw new EmailAlreadyInUseException();
    }

    const passwordHash = await this.passwordService.hash(request.password);
    const pointsBalance = PointsBalanceVO.create(0);

    const newUser = User.create({
      id: UuidGenerator.Generate(),
      username: request.username,
      pointsBalance: pointsBalance,
      createdAt: new Date(),
      email: request.email,
    });
    await this.userRepository.create(newUser);

    const credentials = UserCredentials.create({
      id: UuidGenerator.Generate(),
      userId: newUser.id,
      provider: 'local',
      passwordHash,
    });
    await this.credentialsRepository.create(credentials);

    const accessToken = await this.tokenService.sign(newUser.id);

    return {
      user: newUser,
      accessToken,
    };
  }
}
