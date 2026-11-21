import { Inject, Injectable } from '@nestjs/common';
import {
  APP_LOGGER,
  OPAQUE_TOKEN_SERVICE,
  REFRESH_TOKEN_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type { Logger } from '../../common/interfaces/Logger';
import { InvalidRefreshTokenException } from '../../domain/exceptions/InvalidRefreshToken.exception';
import type { OpaqueTokenService } from '../gateway/OpaqueToken.service';
import type { RefreshTokenRepository } from '../gateway/RefreshToken.repository';
import type { SessionTokens } from '../types/auth.types';
import { SessionIssuer } from './SessionIssuer';

export interface RefreshTokenRequest {
  /** Raw refresh token read from the httpOnly cookie. */
  refreshToken: string;
}

export type RefreshTokenResponse = SessionTokens;

/**
 * Exchanges a refresh token for a new token pair (rotation).
 * Works with an expired access token: the refresh token alone authenticates the request.
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(OPAQUE_TOKEN_SERVICE)
    private readonly opaqueTokens: OpaqueTokenService,
    private readonly sessionIssuer: SessionIssuer,
    @Inject(APP_LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const now = new Date();
    const stored = await this.refreshTokens.findByHash(
      this.opaqueTokens.hash(request.refreshToken),
    );

    if (!stored) {
      throw new InvalidRefreshTokenException();
    }

    if (stored.isRevoked()) {
      // A revoked token coming back means it was copied: end the whole session,
      // unless it is a benign race right after a legitimate rotation.
      if (!stored.isRecentlyRotated(now)) {
        await this.refreshTokens.revokeFamily(stored.familyId, 'reuse', now);
        this.logger.warn(
          `Refresh token reuse detected for user ${stored.userId}: session revoked`,
        );
      }
      throw new InvalidRefreshTokenException();
    }

    if (stored.isExpired(now)) {
      throw new InvalidRefreshTokenException();
    }

    const rotated = await this.refreshTokens.markRotated(stored.id, now);
    if (!rotated) {
      // Another request rotated this token between our read and our write.
      throw new InvalidRefreshTokenException();
    }

    return this.sessionIssuer.continue(stored.userId, stored.familyId, now);
  }
}
