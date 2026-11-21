import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** `CORS_ORIGIN` is a comma-separated list of origins, e.g. `http://localhost:5190,https://app.parkfinder.fr`. */
export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Credentials (the refresh cookie) require an explicit origin list: browsers refuse
 * `Access-Control-Allow-Origin: *` with credentials. `*` is tolerated outside production
 * by reflecting the caller's origin, and rejected in production.
 */
export function buildCorsOptions(
  corsOrigin: string,
  nodeEnv: string,
): { options: CorsOptions; allowsAnyOrigin: boolean } {
  const origins = parseCorsOrigins(corsOrigin);
  const allowsAnyOrigin = origins.includes('*');

  if (allowsAnyOrigin && nodeEnv === 'production') {
    throw new Error(
      'CORS_ORIGIN=* is not allowed in production: list the allowed origins.',
    );
  }

  return {
    options: { origin: allowsAnyOrigin ? true : origins, credentials: true },
    allowsAnyOrigin,
  };
}
