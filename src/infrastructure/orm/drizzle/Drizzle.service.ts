import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { poolConfigFromEnv } from './pool-config';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor() {
    this.pool = new Pool(poolConfigFromEnv(process.env));
    // An idle connection cut by Supabase or the network emits 'error' on the pool; without a
    // listener Node crashes the process. The pool drops that connection and opens a new one.
    this.pool.on('error', (error) => {
      this.logger.warn(
        `Idle database connection lost, the pool will reconnect: ${error.message}`,
      );
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
