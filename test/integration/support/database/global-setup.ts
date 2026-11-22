import { join } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import {
  INTEGRATION_DATABASE_URL_ENV,
  POSTGIS_IMAGE,
  assertIsTestDatabase,
} from './test-database.config';
import { truncateApplicationTables } from './reset-database';

const MIGRATIONS_FOLDER = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'drizzle',
  'migrations',
);

/**
 * Runs once before all integration specs: one database for the whole run
 * (instead of one container per spec file), migrated once, emptied once.
 * - CI / local compose: reuse the database given by INTEGRATION_DATABASE_URL.
 * - Otherwise: start a single PostGIS container with testcontainers.
 * Specs then connect through DATABASE_URL (see create-test-database.ts).
 */
export default async function globalSetup(): Promise<void> {
  let connectionString = process.env[INTEGRATION_DATABASE_URL_ENV];

  if (!connectionString) {
    const container = await new PostgreSqlContainer(POSTGIS_IMAGE).start();
    connectionString = container.getConnectionUri();
    // Only globalTeardown can read globals defined here.
    (globalThis as Record<string, unknown>).__INTEGRATION_PG_CONTAINER__ =
      container;
  }

  assertIsTestDatabase(connectionString);
  process.env.DATABASE_URL = connectionString;
  process.env[INTEGRATION_DATABASE_URL_ENV] = connectionString;

  const pool = new Pool({ connectionString });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    // A reused database may keep rows from an interrupted previous run.
    await truncateApplicationTables(db);
  } finally {
    await pool.end();
  }
}
