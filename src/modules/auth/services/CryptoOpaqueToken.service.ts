import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { OpaqueTokenService } from '../../../application/gateway/OpaqueToken.service';

/** 256 bits of entropy: guessing a token is out of reach. */
const TOKEN_BYTES = 32;

@Injectable()
export class CryptoOpaqueTokenService implements OpaqueTokenService {
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
  }

  /**
   * SHA-256 is enough here (no salt, no bcrypt): the input is a high-entropy random value,
   * not a password, and lookups by hash must be deterministic.
   */
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
