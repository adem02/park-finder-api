import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  AppleOAuthGuard,
  GoogleOAuthGuard,
} from '../../../../src/modules/auth/oauth/OAuthProviderGuard';
import { OAuthProviders } from '../../../../src/modules/auth/oauth/OAuthProviders';
import {
  OAUTH_STATE_COOKIE,
  OAuthStateCookieStore,
} from '../../../../src/modules/auth/oauth/OAuthStateCookieStore';

const makeStore = () =>
  new OAuthStateCookieStore({
    refreshCookie: {
      name: 'pf_refresh',
      path: '/auth',
      secure: false,
      sameSite: 'strict',
    },
  });

const makeReq = (cookies: Record<string, string> = {}) => {
  const res = { cookie: jest.fn(), clearCookie: jest.fn() };
  const req = { cookies, res } as unknown as Request;
  return { req, res: res as unknown as jest.Mocked<Response> };
};

describe('OAuthStateCookieStore', () => {
  it('stores a random state in a short-lived httpOnly Lax cookie and hands it to passport', () => {
    const { req, res } = makeReq();
    const callback = jest.fn();

    makeStore().store(req, {}, callback);

    const [, state] = callback.mock.calls[0] as [null, string];
    expect(state).toMatch(/^[\w-]{20,}$/);
    expect(res.cookie).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      state,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/auth',
        maxAge: 600000,
      }),
    );
  });

  it('accepts the callback when the returned state matches the cookie, then clears it', () => {
    const { req, res } = makeReq({ [OAUTH_STATE_COOKIE]: 'expected-state' });
    const callback = jest.fn();

    makeStore().verify(req, 'expected-state', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('rejects a forged or missing state', () => {
    const forged = makeReq({ [OAUTH_STATE_COOKIE]: 'expected-state' });
    const missing = makeReq();
    const onForged = jest.fn();
    const onMissing = jest.fn();

    makeStore().verify(forged.req, 'attacker-state', onForged);
    makeStore().verify(missing.req, 'expected-state', onMissing);

    expect(onForged).toHaveBeenCalledWith(null, false, expect.anything());
    expect(onMissing).toHaveBeenCalledWith(null, false, expect.anything());
  });
});

describe('OAuthProviders', () => {
  const providersWith = (clientId: string | undefined) =>
    new OAuthProviders({
      get: jest.fn().mockReturnValue(clientId),
    } as unknown as ConfigService);

  it('treats empty or placeholder credentials as not configured', () => {
    expect(providersWith(undefined).isConfigured('google')).toBe(false);
    expect(providersWith('  ').isConfigured('google')).toBe(false);
    expect(providersWith('not-configured').isConfigured('google')).toBe(false);
    expect(
      providersWith('123.apps.googleusercontent.com').isConfigured('google'),
    ).toBe(true);
  });
});

describe('OAuthProviderGuard', () => {
  const providers = { isConfigured: () => true } as unknown as OAuthProviders;
  type WithOptions = { getAuthenticateOptions(): unknown };

  it('asks Google to show the account chooser every time', () => {
    const guard = new GoogleOAuthGuard(providers) as unknown as WithOptions;

    expect(guard.getAuthenticateOptions()).toEqual({
      prompt: 'select_account',
    });
  });

  it('leaves Apple options untouched', () => {
    const guard = new AppleOAuthGuard(providers) as unknown as WithOptions;

    expect(guard.getAuthenticateOptions()).toBeUndefined();
  });
});
