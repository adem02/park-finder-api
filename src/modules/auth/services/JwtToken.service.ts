import { Injectable } from '@nestjs/common';
import { TokenService } from '../../../application/gateway/Token.service';
import {
  AccessToken,
  DecodedToken,
} from '../../../application/types/auth.types';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(userId: string): Promise<AccessToken> {
    const payload = { sub: userId };

    return this.jwtService.signAsync(payload);
  }

  async verify(token: string): Promise<DecodedToken> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      exp: number;
    }>(token);
    return {
      userId: payload.sub,
      expiresAt: new Date(payload.exp * 1000),
    };
  }
}
