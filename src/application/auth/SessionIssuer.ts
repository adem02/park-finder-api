import { Inject, Injectable } from '@nestjs/common';
import {
  OPAQUE_TOKEN_SERVICE,
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_SERVICE,
} from '../../common/constants/injection-tokens.constants';
import { UuidGenerator } from '../../common/utils/UuidGenerator';
import { RefreshToken } from '../../domain/entities/RefreshToken';
import type { OpaqueTokenService } from '../gateway/OpaqueToken.service';
import type { RefreshTokenRepository } from '../gateway/RefreshToken.repository';
import type { TokenService } from '../gateway/Token.service';
import type { SessionTokens } from '../types/auth.types';

/**
 * Issues the token pair of a session: a short-lived access token (JWT)
 * and a long-lived, single-use refresh token stored as a hash.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(OPAQUE_TOKEN_SERVICE)
    private readonly opaqueTokens: OpaqueTokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  /** New login (password, registration, OAuth): starts a new token family. */
  start(userId: string, now: Date = new Date()): Promise<SessionTokens> {
    return this.issue(userId, UuidGenerator.Generate(), now);
  }

  /** Rotation: same session, next token of the family. */
  continue(
    userId: string,
    familyId: string,
    now: Date = new Date(),
  ): Promise<SessionTokens> {
    return this.issue(userId, familyId, now);
  }

  private async issue(
    userId: string,
    familyId: string,
    now: Date,
  ): Promise<SessionTokens> {
    // Housekeeping on the user's own rows: no background job needed.
    await this.refreshTokens.deleteExpiredByUserId(userId, now);

    const value = this.opaqueTokens.generate();
    const refreshToken = RefreshToken.issue({
      id: UuidGenerator.Generate(),
      userId,
      familyId,
      tokenHash: this.opaqueTokens.hash(value),
      now,
    });
    await this.refreshTokens.create(refreshToken);

    const accessToken = await this.tokenService.sign(userId);

    return {
      accessToken,
      refreshToken: { value, expiresAt: refreshToken.expiresAt },
    };
  }
}
