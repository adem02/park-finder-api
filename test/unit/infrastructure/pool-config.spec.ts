import { poolConfigFromEnv } from '../../../src/infrastructure/orm/drizzle/pool-config';

const env = (vars: Record<string, string>): NodeJS.ProcessEnv => ({
  DATABASE_URL: 'postgresql://user:pass@db.example:5432/app',
  ...vars,
});

describe('poolConfigFromEnv', () => {
  it('defaults to 10 connections and no SSL (local Docker database)', () => {
    const config = poolConfigFromEnv(env({}));

    expect(config.connectionString).toBe(
      'postgresql://user:pass@db.example:5432/app',
    );
    expect(config.max).toBe(10);
    expect(config.ssl).toBeUndefined();
  });

  it('caps the pool for hosted plans with a connection limit', () => {
    expect(poolConfigFromEnv(env({ DATABASE_POOL_MAX: '3' })).max).toBe(3);
  });

  it('refuses a pool size that is not a positive integer', () => {
    expect(() => poolConfigFromEnv(env({ DATABASE_POOL_MAX: '0' }))).toThrow(
      /DATABASE_POOL_MAX/,
    );
    expect(() => poolConfigFromEnv(env({ DATABASE_POOL_MAX: 'abc' }))).toThrow(
      /DATABASE_POOL_MAX/,
    );
  });

  it('verifies the server certificate with the provided CA, restoring newlines', () => {
    const config = poolConfigFromEnv(
      env({
        DATABASE_SSL: 'verify',
        DATABASE_SSL_CA:
          '-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----',
      }),
    );

    expect(config.ssl).toEqual({
      rejectUnauthorized: true,
      ca: '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----',
    });
  });

  it('supports encrypted-only connections and rejects unknown modes', () => {
    expect(poolConfigFromEnv(env({ DATABASE_SSL: 'no-verify' })).ssl).toEqual({
      rejectUnauthorized: false,
    });
    expect(() => poolConfigFromEnv(env({ DATABASE_SSL: 'maybe' }))).toThrow(
      /DATABASE_SSL/,
    );
  });

  it('keeps idle connections for 5 minutes (reopening one to Supabase costs ~430 ms)', () => {
    expect(poolConfigFromEnv(env({})).idleTimeoutMillis).toBe(300_000);
  });
});
