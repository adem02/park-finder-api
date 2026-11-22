import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';

// PostGIS installs its own reference tables in the `public` schema
// (e.g. `spatial_ref_sys`). Truncating those wipes SRID metadata and breaks
// geography functions (ST_DWithin, ST_Distance...) for the rest of the test
// run, so they must never be included in the reset.
const POSTGIS_SYSTEM_TABLES = ['spatial_ref_sys'];

/**
 * Empties every application table (public schema). Drizzle's migration
 * journal lives in the `drizzle` schema and is left untouched. Table names
 * come from Postgres' own catalog, not user input, so building the TRUNCATE
 * statement this way is safe.
 *
 * Why TRUNCATE rather than a rolled-back transaction per test: some
 * repositories open their own transactions on the pool, which a wrapping
 * transaction could not contain without rewiring them.
 */
export async function truncateApplicationTables(
  db: NodePgDatabase<Record<string, unknown>>,
): Promise<void> {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );

  const tableNames = rows
    .map((row) => row.tablename)
    .filter((name) => !POSTGIS_SYSTEM_TABLES.includes(name));

  if (tableNames.length === 0) return;

  const tables = tableNames.map((name) => `"${name}"`).join(', ');
  await db.execute(
    sql.raw(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`),
  );
}

/** Between tests: back to empty tables on the shared database. */
export async function resetDatabase(
  drizzleService: DrizzleService,
): Promise<void> {
  await truncateApplicationTables(drizzleService.db);
}
