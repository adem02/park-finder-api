import { DecodedToken } from '../../application/types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}
