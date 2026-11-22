import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import type { IssuedRefreshToken } from '../../application/types/auth.types';
import authConfig from '../../config/auth.config';

/** Reads and writes the refresh token cookie: httpOnly, so page scripts can never read it. */
@Injectable()
export class RefreshTokenCookie {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  read(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[this.config.refreshCookie.name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  write(response: Response, token: IssuedRefreshToken): void {
    response.cookie(this.config.refreshCookie.name, token.value, {
      ...this.baseOptions(),
      expires: token.expiresAt,
    });
  }

  clear(response: Response): void {
    response.clearCookie(this.config.refreshCookie.name, this.baseOptions());
  }

  private baseOptions(): CookieOptions {
    const { path, secure, sameSite } = this.config.refreshCookie;
    return { httpOnly: true, secure, sameSite, path };
  }
}
