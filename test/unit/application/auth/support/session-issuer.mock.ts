import type { SessionIssuer } from '../../../../../src/application/auth/SessionIssuer';
import type { SessionTokens } from '../../../../../src/application/types/auth.types';

export const SESSION_TOKENS: SessionTokens = {
  accessToken: 'access-token',
  refreshToken: {
    value: 'refresh-token',
    expiresAt: new Date('2026-12-21T00:00:00Z'),
  },
};

export const makeSessionIssuer = (): jest.Mocked<SessionIssuer> =>
  ({
    start: jest.fn().mockResolvedValue(SESSION_TOKENS),
    continue: jest.fn().mockResolvedValue(SESSION_TOKENS),
  }) as unknown as jest.Mocked<SessionIssuer>;
