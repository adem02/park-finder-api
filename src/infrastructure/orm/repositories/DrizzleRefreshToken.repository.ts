import { Injectable } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { RefreshTokenRepository } from '../../../application/gateway/RefreshToken.repository';
import { RefreshToken } from '../../../domain/entities/RefreshToken';
import type { RefreshTokenRevocationReason } from '../../../domain/types/refresh-token.types';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { refreshTokens } from '../drizzle/schema';
import { RefreshTokenMapper } from '../mapper/RefreshToken.mapper';

@Injectable()
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(token: RefreshToken): Promise<void> {
    await this.drizzleService.db.insert(refreshTokens).values({
      id: token.id,
      userId: token.userId,
      familyId: token.familyId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      revokedAt: token.revokedAt,
      revokedReason: token.revokedReason,
    });
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    return row ? RefreshTokenMapper.toDomain(row) : null;
  }

  async markRotated(id: string, at: Date): Promise<boolean> {
    // Conditional update: of two concurrent rotations, only one matches the row.
    const updated = await this.drizzleService.db
      .update(refreshTokens)
      .set({ revokedAt: at, revokedReason: 'rotated' })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });

    return updated.length === 1;
  }

  async revokeFamily(
    familyId: string,
    reason: RefreshTokenRevocationReason,
    at: Date,
  ): Promise<void> {
    await this.drizzleService.db
      .update(refreshTokens)
      .set({ revokedAt: at, revokedReason: reason })
      .where(
        and(
          eq(refreshTokens.familyId, familyId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  async deleteExpiredByUserId(userId: string, now: Date): Promise<void> {
    await this.drizzleService.db
      .delete(refreshTokens)
      .where(
        and(eq(refreshTokens.userId, userId), lt(refreshTokens.expiresAt, now)),
      );
  }
}
