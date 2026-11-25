import { EventEmitter } from 'node:events';
import type { LoggerService } from '@nestjs/common';
import type { Request, Response } from 'express';
import { requestLogging } from '../../../src/common/logger/request-logging.middleware';

function makeLogger() {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
  } as unknown as jest.Mocked<LoggerService>;
}

function run(
  {
    url,
    status,
    requestId,
  }: { url: string; status: number; requestId?: string },
  logger = makeLogger(),
) {
  const request = {
    method: 'GET',
    originalUrl: url,
    header: (name: string) => (name === 'X-Request-Id' ? requestId : undefined),
  } as unknown as Request;
  const emitter = new EventEmitter();
  const headers: Record<string, string> = {};
  const response = Object.assign(emitter, {
    statusCode: status,
    setHeader: (name: string, value: string) => (headers[name] = value),
  }) as unknown as Response;
  const next = jest.fn();

  requestLogging(logger)(request, response, next);
  emitter.emit('finish');
  return { logger, request, headers, next };
}

describe('requestLogging', () => {
  it('logs one line per request, without the query string (it holds the position)', () => {
    const { logger, next } = run({
      url: '/parkings?latitude=49.25&longitude=4.03',
      status: 200,
    });

    expect(next).toHaveBeenCalled();
    const [entry] = (logger.log as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(entry).toMatchObject({
      method: 'GET',
      path: '/parkings',
      status: 200,
    });
    expect(JSON.stringify(entry)).not.toContain('49.25');
  });

  it('gives every request an id, sent back in X-Request-Id', () => {
    const { request, headers } = run({ url: '/parkings', status: 200 });

    expect(request.requestId).toMatch(/^[\w-]{36}$/);
    expect(headers['X-Request-Id']).toBe(request.requestId);
  });

  it('keeps a well-formed incoming id, replaces a suspicious one', () => {
    expect(
      run({ url: '/x', status: 200, requestId: 'client-id-1234' }).request
        .requestId,
    ).toBe('client-id-1234');
    expect(
      run({ url: '/x', status: 200, requestId: '<script>' }).request.requestId,
    ).not.toBe('<script>');
  });

  it('logs 4xx as warnings, 5xx as errors and /health quietly', () => {
    expect(
      run({ url: '/auth/login', status: 401 }).logger.warn,
    ).toHaveBeenCalled();
    expect(
      run({ url: '/parkings/new', status: 500 }).logger.error,
    ).toHaveBeenCalled();
    const health = run({ url: '/health', status: 200 }).logger;
    expect(health.verbose).toHaveBeenCalled();
    expect(health.log).not.toHaveBeenCalled();
  });
});
