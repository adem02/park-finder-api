export type Provider = 'local' | 'google' | 'apple';

export interface OAuthProfile {
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}
