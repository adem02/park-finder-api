import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/orm/drizzle/Drizzle.service';
import { Public } from '../auth/decorators/public.decorator';

const DATABASE_CHECK_TIMEOUT_MS = 3000;

/**
 * Liveness + database check, for the container platform and the scheduled ping
 * that keeps the free Supabase project from pausing (it counts as activity).
 */
@Controller('health')
export class HealthController {
  constructor(private readonly drizzleService: DrizzleService) {}

  @Get()
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check: API up and database reachable' })
  @ApiResponse({ status: 200, description: '{ status: "ok", database: "up" }' })
  @ApiResponse({ status: 503, description: 'Database unreachable' })
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await withTimeout(
        this.drizzleService.db.execute(sql`select 1`),
        DATABASE_CHECK_TIMEOUT_MS,
      );
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
    return { status: 'ok', database: 'up' };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Database check timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
