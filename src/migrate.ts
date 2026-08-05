import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DrizzleService } from './infrastructure/orm/drizzle/Drizzle.service';

/**
 * Standalone migration runner, executed against a running deployment
 * (`yarn migrate:deploy`). Uses Drizzle's programmatic migrator directly
 * instead of the drizzle-kit CLI so it only needs regular dependencies
 * (drizzle-orm, pg), consistent with the test harness.
 */
async function main() {
  const drizzleService = new DrizzleService();

  await migrate(drizzleService.db, {
    migrationsFolder: join(__dirname, '..', 'drizzle', 'migrations'),
  });

  await drizzleService.onModuleDestroy();
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
