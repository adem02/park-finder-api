import { RefreshToken } from '../../../domain/entities/RefreshToken';
import type { RefreshTokenRevocationReason } from '../../../domain/types/refresh-token.types';

interface RefreshTokenModel {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  revokedReason: RefreshTokenRevocationReason | null;
}

export class RefreshTokenMapper {
  static toDomain(model: RefreshTokenModel): RefreshToken {
    return RefreshToken.reconstitute({
      id: model.id,
      userId: model.userId,
      familyId: model.familyId,
      tokenHash: model.tokenHash,
      expiresAt: model.expiresAt,
      createdAt: model.createdAt,
      revokedAt: model.revokedAt,
      revokedReason: model.revokedReason,
    });
  }
}
