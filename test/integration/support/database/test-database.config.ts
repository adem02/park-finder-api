// Must match the postgres image used in docker-compose.yml so tests run
// against the same PostGIS version as dev/prod.
export const POSTGIS_IMAGE = 'postgis/postgis:16-3.4';

/**
 * Set it to reuse an already running database instead of starting a container:
 * the GitHub Actions `services:` container in CI, or the `postgres-test`
 * docker compose service locally (see `docs/architecture.md`).
 */
export const INTEGRATION_DATABASE_URL_ENV = 'INTEGRATION_DATABASE_URL';

/**
 * Integration tests truncate every table. Refuse anything that does not look
 * like a throwaway test database, so a wrong URL can never wipe dev or prod
 * data. Testcontainers creates a database named `test`; others must end with
 * `_test` (e.g. `parkfinder_test`).
 */
export function assertIsTestDatabase(connectionString: string): void {
  const databaseName = new URL(connectionString).pathname.replace(/^\//, '');
  if (databaseName !== 'test' && !databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against "${databaseName}": ` +
        'the database name must be "test" or end with "_test".',
    );
  }
}
