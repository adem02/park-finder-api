import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-apple';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OAuthUseCase,
  OAuthResponse,
} from '../../../application/auth/OAuth.use-case';

interface AppleIdTokenPayload {
  sub: string;
  email?: string;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly config: ConfigService,
    private readonly oAuthUseCase: OAuthUseCase,
  ) {
    super({
      clientID: config.get<string>('apple.clientId')!,
      teamID: config.get<string>('apple.teamId')!,
      keyID: config.get<string>('apple.keyId')!,
      privateKeyString: config.get<string>('apple.privateKey')!,
      callbackURL: config.get<string>('apple.callbackUrl')!,
      scope: ['email', 'name'],
    });
  }

  validate(
    _req: Request,
    _accessToken: string,
    _refreshToken: string,
    idToken: string,
    _profile: Profile,
  ): Promise<OAuthResponse> {
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'),
    ) as AppleIdTokenPayload;

    return this.oAuthUseCase.execute({
      provider: 'apple',
      providerId: payload.sub,
      email: payload.email,
    });
  }
}
