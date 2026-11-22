import { ServiceUnavailableException } from '@nestjs/common';
import type { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { HealthController } from '../../../../src/modules/health/health.controller';

const controllerWith = (execute: jest.Mock) =>
  new HealthController({ db: { execute } } as unknown as DrizzleService);

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const execute = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });

    await expect(controllerWith(execute).check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('answers 503 when the database is unreachable', async () => {
    const execute = jest
      .fn()
      .mockRejectedValue(new Error('connection refused'));

    await expect(controllerWith(execute).check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('answers 503 instead of hanging when the database does not respond', async () => {
    jest.useFakeTimers();
    const execute = jest.fn().mockReturnValue(new Promise(() => undefined));

    const result = controllerWith(execute).check();
    jest.advanceTimersByTime(3000);

    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    jest.useRealTimers();
  });
});
