export type AccessToken = string;

export interface DecodedToken {
  userId: string;
  expiresAt: Date;
}
