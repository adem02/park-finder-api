import { loggerOptionsFromEnv } from '../../../src/common/logger/logger-options';

describe('loggerOptionsFromEnv', () => {
  it('writes JSON from "log" up in production', () => {
    expect(loggerOptionsFromEnv({ NODE_ENV: 'production' })).toEqual({
      json: true,
      timestamp: false,
      logLevels: ['fatal', 'error', 'warn', 'log'],
    });
  });

  it('writes readable text down to "debug" elsewhere', () => {
    expect(loggerOptionsFromEnv({ NODE_ENV: 'development' })).toEqual({
      json: false,
      timestamp: true,
      logLevels: ['fatal', 'error', 'warn', 'log', 'debug'],
    });
  });

  it('lets LOG_FORMAT and LOG_LEVEL override the defaults', () => {
    expect(
      loggerOptionsFromEnv({
        NODE_ENV: 'production',
        LOG_FORMAT: 'text',
        LOG_LEVEL: 'warn',
      }),
    ).toEqual({
      json: false,
      timestamp: true,
      logLevels: ['fatal', 'error', 'warn'],
    });
  });
});
