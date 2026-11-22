import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Response } from 'express';
import appConfig from '../../../config/app.config';

/** Error codes the PWA understands on its login page (`?oauthError=`). */
export type OAuthErrorCode = 'google_unavailable' | 'google_failed';

/** Where the browser goes back to after a social sign-in. No token ever travels in the URL. */
@Injectable()
export class OAuthRedirect {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  /** The refresh cookie is set: the PWA restores the session from it. */
  success(res: Response): void {
    res.redirect(
      302,
      new URL('/auth/callback', this.config.frontendUrl).toString(),
    );
  }

  failure(res: Response, code: OAuthErrorCode): void {
    const url = new URL('/login', this.config.frontendUrl);
    url.searchParams.set('oauthError', code);
    res.redirect(302, url.toString());
  }
}
