import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request } from 'express';
import authConfig from '../../../config/auth.config';

export const OAUTH_STATE_COOKIE = 'pf_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000;

type StoreCallback = (error: Error | null, state?: string) => void;
type VerifyCallback = (
  error: Error | null,
  ok: boolean,
  info?: { message: string },
) => void;

/**
 * CSRF protection for the OAuth redirect flow without a server session:
 * the `state` sent to the provider is also kept in a short-lived httpOnly cookie,
 * and the callback is accepted only if both match.
 * SameSite=Lax (not Strict): the callback is a top-level navigation coming from
 * the provider's site, and Lax cookies are sent on those GET navigations.
 *
 * Signatures follow passport-oauth2's state store contract (`store(req, meta, cb)`,
 * `verify(req, state, cb)`), detected by arity.
 */
@Injectable()
export class OAuthStateCookieStore {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  store(req: Request, _meta: unknown, callback: StoreCallback): void {
    const state = randomBytes(16).toString('base64url');
    req.res?.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.cookieOptions(),
      maxAge: STATE_TTL_MS,
    });
    callback(null, state);
  }

  verify(req: Request, state: unknown, callback: VerifyCallback): void {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const expected = cookies?.[OAUTH_STATE_COOKIE];
    // Single use, whatever the outcome.
    req.res?.clearCookie(OAUTH_STATE_COOKIE, this.cookieOptions());

    if (
      typeof expected !== 'string' ||
      typeof state !== 'string' ||
      !sameValue(expected, state)
    ) {
      callback(null, false, { message: 'Invalid OAuth state' });
      return;
    }
    callback(null, true);
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.refreshCookie.secure,
      sameSite: 'lax',
      path: '/auth',
    };
  }
}

function sameValue(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
