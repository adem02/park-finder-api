import { registerAs } from '@nestjs/config';

export type CookieSameSite = 'strict' | 'lax' | 'none';

export const REFRESH_COOKIE_NAME = 'pf_refresh';

export interface AuthConfig {
  refreshCookie: {
    name: string;
    /** Sent only to /auth/* (refresh, logout): never attached to the rest of the API. */
    path: string;
    secure: boolean;
    sameSite: CookieSameSite;
  };
}

export default registerAs('auth', (): AuthConfig => {
  const sameSite = (process.env.REFRESH_COOKIE_SAME_SITE ??
    'strict') as CookieSameSite;
  const secure =
    process.env.REFRESH_COOKIE_SECURE === undefined
      ? process.env.NODE_ENV === 'production'
      : process.env.REFRESH_COOKIE_SECURE === 'true';

  return {
    refreshCookie: {
      name: REFRESH_COOKIE_NAME,
      path: '/auth',
      // Browsers reject SameSite=None cookies that are not Secure.
      secure: secure || sameSite === 'none',
      sameSite,
    },
  };
});
