import { RefreshToken } from '../../domain/entities/RefreshToken';
import type { RefreshTokenRevocationReason } from '../../domain/types/refresh-token.types';

export interface RefreshTokenRepository {
  create(token: RefreshToken): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  /**
   * Atomically revokes a still-active token as "rotated".
   * Returns false when it was already revoked (another request rotated it first).
   */
  markRotated(id: string, at: Date): Promise<boolean>;
  /** Revokes every still-active token of the family (a whole login session). */
  revokeFamily(
    familyId: string,
    reason: RefreshTokenRevocationReason,
    at: Date,
  ): Promise<void>;
  deleteExpiredByUserId(userId: string, now: Date): Promise<void>;
}
