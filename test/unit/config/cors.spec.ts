import { buildCorsOptions, parseCorsOrigins } from '../../../src/config/cors';

describe('CORS configuration', () => {
  it('should parse a comma-separated list of origins', () => {
    expect(
      parseCorsOrigins(' http://localhost:5190, https://app.parkfinder.fr ,'),
    ).toEqual(['http://localhost:5190', 'https://app.parkfinder.fr']);
  });

  it('should allow credentials for the listed origins only', () => {
    const { options, allowsAnyOrigin } = buildCorsOptions(
      'http://localhost:5190',
      'production',
    );

    expect(options).toEqual({
      origin: ['http://localhost:5190'],
      credentials: true,
    });
    expect(allowsAnyOrigin).toBe(false);
  });

  it('should reflect any origin for * outside production', () => {
    const { options, allowsAnyOrigin } = buildCorsOptions('*', 'development');

    expect(options.origin).toBe(true);
    expect(allowsAnyOrigin).toBe(true);
  });

  it('should refuse * in production', () => {
    expect(() => buildCorsOptions('*', 'production')).toThrow(/not allowed/);
  });
});
