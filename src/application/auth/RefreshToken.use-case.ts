import { Inject, Injectable } from '@nestjs/common';
import { AccessToken } from '../types/auth.types';
import type { TokenService } from '../gateway/Token.service';
import { TOKEN_SERVICE } from '../../common/constants/injection-tokens.constants';

export interface RefreshTokenRequest {
  userId: string;
}

export interface RefreshTokenResponse {
  accessToken: AccessToken;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
  ) {}

  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const accessToken = await this.tokenService.sign(request.userId);

    return { accessToken };
  }
}
