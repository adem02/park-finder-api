import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';

// PostGIS installs its own reference tables in the `public` schema
// (e.g. `spatial_ref_sys`). Truncating those wipes SRID metadata and breaks
// geography functions (ST_DWithin, ST_Distance...) for the rest of the test
// run, so they must never be included in the reset.
const POSTGIS_SYSTEM_TABLES = ['spatial_ref_sys'];

/**
 * Truncates every application table (public schema) between tests, so each
 * test starts from a clean slate without needing to recreate the container.
 * Table names come from Postgres' own catalog, not user input, so building
 * the TRUNCATE statement this way is safe.
 */
export async function resetDatabase(
  drizzleService: DrizzleService,
): Promise<void> {
  const { rows } = await drizzleService.db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );

  const tableNames = rows
    .map((row) => row.tablename)
    .filter((name) => !POSTGIS_SYSTEM_TABLES.includes(name));

  if (tableNames.length === 0) return;

  const tables = tableNames.map((name) => `"${name}"`).join(', ');
  await drizzleService.db.execute(
    sql.raw(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`),
  );
}
