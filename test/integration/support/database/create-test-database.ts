import { join } from 'node:path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';

// Must match the postgres image used in docker-compose.yml so tests run
// against the same PostGIS version as dev/prod.
const POSTGIS_IMAGE = 'postgis/postgis:16-3.4';

const MIGRATIONS_FOLDER = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'drizzle',
  'migrations',
);

export interface TestDatabase {
  drizzleService: DrizzleService;
  stop(): Promise<void>;
}

/**
 * Boots an ephemeral Postgres+PostGIS container, points DrizzleService at it
 * and applies every Drizzle migration. One container is meant to be shared
 * across all tests in a single spec file (started in beforeAll, stopped in
 * afterAll) — use resetDatabase() in afterEach to wipe data between tests.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    POSTGIS_IMAGE,
  ).start();

  process.env.DATABASE_URL = container.getConnectionUri();
  const drizzleService = new DrizzleService();

  await migrate(drizzleService.db, { migrationsFolder: MIGRATIONS_FOLDER });

  return {
    drizzleService,
    async stop() {
      await drizzleService.onModuleDestroy();
      await container.stop();
    },
  };
}
