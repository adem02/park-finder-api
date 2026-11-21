import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import {
  INTEGRATION_DATABASE_URL_ENV,
  assertIsTestDatabase,
} from './test-database.config';

export interface TestDatabase {
  drizzleService: DrizzleService;
  stop(): Promise<void>;
}

/**
 * Connects to the shared integration database prepared by globalSetup
 * (already migrated). Call it in beforeAll, `stop()` in afterAll, and
 * resetDatabase() in afterEach to start every test from empty tables.
 */
export function createTestDatabase(): Promise<TestDatabase> {
  const connectionString = process.env[INTEGRATION_DATABASE_URL_ENV];
  if (!connectionString) {
    throw new Error(
      'No integration database: run integration tests with `yarn test:integration` (globalSetup prepares it).',
    );
  }
  assertIsTestDatabase(connectionString);

  // DrizzleService reads DATABASE_URL, like in the app.
  process.env.DATABASE_URL = connectionString;
  const drizzleService = new DrizzleService();

  return Promise.resolve({
    drizzleService,
    stop: () => drizzleService.onModuleDestroy(),
  });
}
