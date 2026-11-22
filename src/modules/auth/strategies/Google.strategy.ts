import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  Profile,
  type StrategyOptions,
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import {
  OAuthUseCase,
  OAuthResponse,
} from '../../../application/auth/OAuth.use-case';
import { OAuthStateCookieStore } from '../oauth/OAuthStateCookieStore';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly config: ConfigService,
    private readonly oAuthUseCase: OAuthUseCase,
    stateStore: OAuthStateCookieStore,
  ) {
    super({
      clientID: config.get<string>('google.clientId')!,
      clientSecret: config.get<string>('google.clientSecret')!,
      callbackURL: config.get<string>('google.callbackUrl')!,
      scope: ['email', 'profile'],
      // CSRF protection of the redirect flow (see OAuthStateCookieStore).
      // passport-oauth2 picks the store signature by arity at runtime; its typings
      // describe it as overloads a single 3-argument method cannot match.
      store: stateStore as unknown as StrategyOptions['store'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<OAuthResponse> {
    return this.oAuthUseCase.execute({
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      photoUrl: profile.photos?.[0]?.value,
    });
  }
}
