import type { ConsoleLoggerOptions, LogLevel } from '@nestjs/common';

/** From the most to the least severe: a level keeps itself and everything above it. */
const LEVELS: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

/**
 * One JSON object per line in production (Cockpit/Grafana can filter on its fields), readable
 * text elsewhere. `LOG_FORMAT` (json | text) and `LOG_LEVEL` (fatal … verbose) override the defaults.
 */
export function loggerOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ConsoleLoggerOptions {
  const production = env.NODE_ENV === 'production';
  const json = env.LOG_FORMAT ? env.LOG_FORMAT === 'json' : production;
  const wanted = (env.LOG_LEVEL ?? (production ? 'log' : 'debug')) as LogLevel;
  const index = LEVELS.includes(wanted) ? LEVELS.indexOf(wanted) : 3;

  return { json, timestamp: !json, logLevels: LEVELS.slice(0, index + 1) };
}
