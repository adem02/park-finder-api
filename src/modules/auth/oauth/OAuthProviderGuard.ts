import { ExecutionContext, Injectable, mixin, type Type } from '@nestjs/common';
import { AuthGuard, type IAuthGuard } from '@nestjs/passport';
import { OAuthProviders, type OAuthProvider } from './OAuthProviders';

/**
 * Passport guard for a social provider that never answers with a JSON error:
 * the flow is a browser navigation, so the controller redirects back to the PWA
 * with an error code instead.
 * - Provider not configured: the guard lets the request through without a user.
 * - Consent refused, invalid state, provider error: no user either.
 */
export function OAuthProviderGuard(provider: OAuthProvider): Type<IAuthGuard> {
  @Injectable()
  class Guard extends AuthGuard(provider) {
    constructor(private readonly providers: OAuthProviders) {
      super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
      if (!this.providers.isConfigured(provider)) return true;
      try {
        return (await super.canActivate(context)) as boolean;
      } catch {
        return true;
      }
    }

    handleRequest<TUser>(_error: unknown, user: TUser): TUser | null {
      return user || null;
    }

    /**
     * Google: always show the account chooser. Signing out of ParkFinder does not sign
     * out of Google, so without it the user would be signed back in silently, with no
     * way to pick another account or to cancel.
     */
    getAuthenticateOptions(): Record<string, string> | undefined {
      return provider === 'google' ? { prompt: 'select_account' } : undefined;
    }
  }

  return mixin(Guard);
}

export const GoogleOAuthGuard = OAuthProviderGuard('google');
export const AppleOAuthGuard = OAuthProviderGuard('apple');
