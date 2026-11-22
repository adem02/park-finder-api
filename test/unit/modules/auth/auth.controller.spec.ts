import { ExecutionContext, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { LoginUseCase } from '../../../../src/application/auth/Login.use-case';
import { LogoutUseCase } from '../../../../src/application/auth/Logout.use-case';
import { RefreshTokenUseCase } from '../../../../src/application/auth/RefreshToken.use-case';
import { RegisterUseCase } from '../../../../src/application/auth/Register.use-case';
import { DomainExceptionFilter } from '../../../../src/common/filters/DomainException.filter';
import appConfig from '../../../../src/config/app.config';
import authConfig from '../../../../src/config/auth.config';
import { InvalidRefreshTokenException } from '../../../../src/domain/exceptions/InvalidRefreshToken.exception';
import { AuthController } from '../../../../src/modules/auth/auth.controller';
import { RefreshTokenCookie } from '../../../../src/modules/auth/RefreshTokenCookie';
import { GoogleOAuthGuard } from '../../../../src/modules/auth/oauth/OAuthProviderGuard';
import { OAuthProviders } from '../../../../src/modules/auth/oauth/OAuthProviders';
import { OAuthRedirect } from '../../../../src/modules/auth/oauth/OAuthRedirect';

const EXPIRES_AT = new Date('2026-12-21T12:00:00Z');
const session = (value: string) => ({
  accessToken: `access-for-${value}`,
  refreshToken: { value, expiresAt: EXPIRES_AT },
});

const setCookies = (response: request.Response): string[] => {
  const header = response.headers['set-cookie'] as unknown;
  if (Array.isArray(header)) return header as string[];
  return typeof header === 'string' ? [header] : [];
};

describe('AuthController (HTTP, cookies)', () => {
  let app: INestApplication<App>;
  const loginUseCase = { execute: jest.fn() };
  const refreshTokenUseCase = { execute: jest.fn() };
  const logoutUseCase = { execute: jest.fn() };
  const oauthProviders = { isConfigured: jest.fn().mockReturnValue(true) };
  /** Stands in for passport: the user the Google strategy would have produced (or none). */
  let googleUser: unknown = null;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [authConfig, appConfig],
          ignoreEnvFile: true,
        }),
      ],
      controllers: [AuthController],
      providers: [
        RefreshTokenCookie,
        { provide: LoginUseCase, useValue: loginUseCase },
        { provide: RegisterUseCase, useValue: { execute: jest.fn() } },
        { provide: RefreshTokenUseCase, useValue: refreshTokenUseCase },
        { provide: LogoutUseCase, useValue: logoutUseCase },
        { provide: APP_FILTER, useClass: DomainExceptionFilter },
        OAuthRedirect,
        { provide: OAuthProviders, useValue: oauthProviders },
      ],
    })
      .overrideGuard(GoogleOAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ user: unknown }>().user =
            googleUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    oauthProviders.isConfigured.mockReturnValue(true);
    googleUser = null;
  });

  it('login returns the access token in the body and the refresh token in an httpOnly cookie', async () => {
    loginUseCase.execute.mockResolvedValue({
      user: { id: 'user-1', username: 'johndoe' },
      ...session('raw-refresh'),
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'john@example.com', password: 'Secret1!' })
      .expect(201);

    expect(response.body).toEqual({
      user: { id: 'user-1', username: 'johndoe' },
      accessToken: 'access-for-raw-refresh',
    });
    const [cookie] = setCookies(response);
    expect(cookie).toContain('pf_refresh=raw-refresh');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/auth');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain(`Expires=${EXPIRES_AT.toUTCString()}`);
  });

  it('refresh works without an access token and rotates the cookie', async () => {
    refreshTokenUseCase.execute.mockResolvedValue(session('next-refresh'));

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', 'pf_refresh=old-refresh')
      .expect(200);

    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'old-refresh',
    });
    expect(response.body).toEqual({ accessToken: 'access-for-next-refresh' });
    expect(setCookies(response)[0]).toContain('pf_refresh=next-refresh');
  });

  it('refresh without cookie answers 401', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);

    expect(refreshTokenUseCase.execute).not.toHaveBeenCalled();
  });

  it('refresh with a rejected token answers 401 and clears the cookie', async () => {
    refreshTokenUseCase.execute.mockRejectedValue(
      new InvalidRefreshTokenException(),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', 'pf_refresh=stolen')
      .expect(401);

    const [cookie] = setCookies(response);
    expect(cookie).toContain('pf_refresh=;');
    expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('logout revokes the session and clears the cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', 'pf_refresh=current')
      .expect(204);

    expect(logoutUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'current',
    });
    expect(setCookies(response)[0]).toContain('pf_refresh=;');
  });

  describe('Google sign-in', () => {
    it('callback: sets the refresh cookie and redirects to the PWA without any token in the URL', async () => {
      googleUser = {
        user: { id: 'user-1', username: 'johndoe' },
        ...session('google-refresh'),
      };

      const response = await request(app.getHttpServer())
        .get('/auth/google/callback?code=abc&state=xyz')
        .expect(302);

      expect(response.headers.location).toBe(
        'http://localhost:5190/auth/callback',
      );
      expect(setCookies(response)[0]).toContain('pf_refresh=google-refresh');
    });

    it('callback without user (consent refused, bad state): back to the login page with an error code', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/google/callback?error=access_denied')
        .expect(302);

      expect(response.headers.location).toBe(
        'http://localhost:5190/login?oauthError=google_failed',
      );
      expect(setCookies(response)).toEqual([]);
    });

    it('start: when Google is not configured, back to the login page instead of a 500', async () => {
      oauthProviders.isConfigured.mockReturnValue(false);

      const response = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302);

      expect(response.headers.location).toBe(
        'http://localhost:5190/login?oauthError=google_unavailable',
      );
    });
  });
});
