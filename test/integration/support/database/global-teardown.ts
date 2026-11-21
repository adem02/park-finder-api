import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/** Stops the container started by globalSetup, if any (a reused database is left running). */
export default async function globalTeardown(): Promise<void> {
  const container = (globalThis as Record<string, unknown>)
    .__INTEGRATION_PG_CONTAINER__ as StartedPostgreSqlContainer | undefined;
  await container?.stop();
}
