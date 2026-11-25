import { DecodedToken } from '../../application/types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
      /** Set by the request logging middleware, also sent back in X-Request-Id. */
      requestId?: string;
    }
  }
}
