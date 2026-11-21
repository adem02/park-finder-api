/** Random, unguessable tokens that carry no data (unlike a JWT). */
export interface OpaqueTokenService {
  generate(): string;
  /** Deterministic hash used to store and look up a token without keeping it in clear. */
  hash(token: string): string;
}
