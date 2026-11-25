import { randomUUID } from 'node:crypto';
import type { LoggerService } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';
const INCOMING_ID = /^[\w-]{8,64}$/;

/**
 * One log line per request: method, path, status, duration and a request id, also sent back in
 * `X-Request-Id` so a user's failing request can be found in the logs. Never logs the query
 * string (it carries the user's position), headers, cookies or bodies.
 */
export function requestLogging(logger: LoggerService) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const incoming = request.header(REQUEST_ID_HEADER);
    const requestId =
      incoming && INCOMING_ID.test(incoming) ? incoming : randomUUID();
    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    const startedAt = process.hrtime.bigint();
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const entry = {
        requestId,
        method: request.method,
        path: request.originalUrl.split('?')[0],
        status: response.statusCode,
        durationMs: Math.round(durationMs),
      };
      const line = `${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms`;

      if (entry.status >= 500) logger.error({ msg: line, ...entry });
      else if (entry.status >= 400) logger.warn({ msg: line, ...entry });
      else if (entry.path === '/health')
        logger.verbose?.({ msg: line, ...entry });
      else logger.log({ msg: line, ...entry });
    });

    next();
  };
}
