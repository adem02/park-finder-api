import { Inject, Injectable } from '@nestjs/common';
import {
  OPAQUE_TOKEN_SERVICE,
  REFRESH_TOKEN_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type { OpaqueTokenService } from '../gateway/OpaqueToken.service';
import type { RefreshTokenRepository } from '../gateway/RefreshToken.repository';

export interface LogoutRequest {
  refreshToken?: string;
}

/**
 * Ends the session the refresh token belongs to (every token of its family).
 * Idempotent: an unknown, expired or missing token is not an error.
 * The access token stays valid until it expires, which is why it is short-lived.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(OPAQUE_TOKEN_SERVICE)
    private readonly opaqueTokens: OpaqueTokenService,
  ) {}

  async execute(request: LogoutRequest): Promise<void> {
    if (!request.refreshToken) return;

    const stored = await this.refreshTokens.findByHash(
      this.opaqueTokens.hash(request.refreshToken),
    );
    if (!stored) return;

    await this.refreshTokens.revokeFamily(
      stored.familyId,
      'logout',
      new Date(),
    );
  }
}
