import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type OAuthProvider = 'google' | 'apple';

/** Value used in .env.example while a provider is not set up yet. */
const NOT_CONFIGURED = 'not-configured';

/**
 * Tells which social sign-in providers are set up. An unconfigured provider is
 * not registered at all, so the API still starts with placeholder credentials.
 */
@Injectable()
export class OAuthProviders {
  constructor(private readonly config: ConfigService) {}

  isConfigured(provider: OAuthProvider): boolean {
    const clientId = this.config.get<string>(`${provider}.clientId`)?.trim();
    return Boolean(clientId) && clientId !== NOT_CONFIGURED;
  }
}
