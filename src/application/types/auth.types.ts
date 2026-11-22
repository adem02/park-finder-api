export type AccessToken = string;

export interface DecodedToken {
  userId: string;
  expiresAt: Date;
}

/** Raw refresh token, handed to the client once (in an httpOnly cookie) and never stored. */
export interface IssuedRefreshToken {
  value: string;
  expiresAt: Date;
}

export interface SessionTokens {
  accessToken: AccessToken;
  refreshToken: IssuedRefreshToken;
}
