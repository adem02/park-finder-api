import type { PoolConfig } from 'pg';

const DEFAULT_POOL_MAX = 10;

export type DatabaseSslMode = 'off' | 'no-verify' | 'verify';

/**
 * Connection pool settings read from the environment, shared by the app,
 * the migration runner and the seed script.
 * - DATABASE_POOL_MAX: hosted Postgres plans (Supabase Free) cap connections,
 *   and each serverless container instance opens its own pool.
 * - DATABASE_SSL: `off` locally (default), `verify` with DATABASE_SSL_CA (the
 *   provider's CA certificate, PEM) in production, `no-verify` as a fallback
 *   (encrypted but not authenticated). Keep `sslmode` out of DATABASE_URL.
 */
export function poolConfigFromEnv(env: NodeJS.ProcessEnv): PoolConfig {
  return {
    connectionString: env.DATABASE_URL,
    max: poolMax(env.DATABASE_POOL_MAX),
    ssl: sslConfig(env),
  };
}

function poolMax(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_POOL_MAX;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `DATABASE_POOL_MAX must be a positive integer, got "${raw}".`,
    );
  }
  return value;
}

function sslConfig(env: NodeJS.ProcessEnv): PoolConfig['ssl'] {
  const mode = (env.DATABASE_SSL ?? 'off') as DatabaseSslMode;
  switch (mode) {
    case 'off':
      return undefined;
    case 'no-verify':
      return { rejectUnauthorized: false };
    case 'verify': {
      // Env vars often carry the PEM on one line with literal "\n".
      const ca = env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
      return ca
        ? { rejectUnauthorized: true, ca }
        : { rejectUnauthorized: true };
    }
    default:
      throw new Error(
        `DATABASE_SSL must be "off", "no-verify" or "verify", got "${String(mode)}".`,
      );
  }
}
