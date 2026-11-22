import {
  REFRESH_TOKEN_REUSE_GRACE_SECONDS,
  REFRESH_TOKEN_TTL_DAYS,
} from '../constants/auth.constants';
import type { RefreshTokenRevocationReason } from '../types/refresh-token.types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface IssueRefreshTokenParams {
  id: string;
  userId: string;
  /** Every token issued by rotation from the same login shares this id. */
  familyId: string;
  /** Only a hash is stored: a database leak does not expose usable tokens. */
  tokenHash: string;
  now: Date;
}

interface RefreshTokenParams {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  revokedReason: RefreshTokenRevocationReason | null;
}

/**
 * Long-lived credential used to obtain new access tokens.
 * Single use: each refresh revokes it ("rotated") and issues a new one in the same family.
 */
export class RefreshToken {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly familyId: string,
    readonly tokenHash: string,
    readonly expiresAt: Date,
    readonly createdAt: Date,
    readonly revokedAt: Date | null,
    readonly revokedReason: RefreshTokenRevocationReason | null,
  ) {}

  static issue(params: IssueRefreshTokenParams): RefreshToken {
    return new RefreshToken(
      params.id,
      params.userId,
      params.familyId,
      params.tokenHash,
      new Date(params.now.getTime() + REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      params.now,
      null,
      null,
    );
  }

  static reconstitute(params: RefreshTokenParams): RefreshToken {
    return new RefreshToken(
      params.id,
      params.userId,
      params.familyId,
      params.tokenHash,
      params.expiresAt,
      params.createdAt,
      params.revokedAt,
      params.revokedReason,
    );
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  /** Replayed shortly after a legitimate rotation: a race, not a stolen token. */
  isRecentlyRotated(now: Date): boolean {
    return (
      this.revokedReason === 'rotated' &&
      this.revokedAt !== null &&
      now.getTime() - this.revokedAt.getTime() <
        REFRESH_TOKEN_REUSE_GRACE_SECONDS * 1000
    );
  }
}
