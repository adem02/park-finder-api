import { AccessToken, DecodedToken } from '../types/auth.types';

export interface TokenService {
  sign(userId: string): Promise<AccessToken>;
  verify(token: string): Promise<DecodedToken>;
}
