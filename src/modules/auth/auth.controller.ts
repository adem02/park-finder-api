import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RegisterInputDTO, RegisterOutputDTO } from './dto/Register.dto';
import { LoginInputDTO, LoginOutputDTO } from './dto/Login.dto';
import { RegisterUseCase } from '../../application/auth/Register.use-case';
import { LoginUseCase } from '../../application/auth/Login.use-case';
import type { OAuthResponse } from '../../application/auth/OAuth.use-case';
import { RefreshTokenUseCase } from '../../application/auth/RefreshToken.use-case';
import { LogoutUseCase } from '../../application/auth/Logout.use-case';
import { InvalidRefreshTokenException } from '../../domain/exceptions/InvalidRefreshToken.exception';
import { REFRESH_COOKIE_NAME } from '../../config/auth.config';
import { Public } from './decorators/public.decorator';
import { OAuthOutputDTO } from './dto/OAuth.dto';
import { RefreshTokenOutputDTO } from './dto/RefreshToken.dto';
import { RefreshTokenCookie } from './RefreshTokenCookie';

/**
 * Every login (register, password, OAuth) returns the access token in the body
 * and sets the refresh token in an httpOnly cookie scoped to /auth.
 */
@Throttle({ default: { ttl: 60000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshCookie: RefreshTokenCookie,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, type: RegisterOutputDTO })
  async register(
    @Body() body: RegisterInputDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.registerUseCase.execute(body);
    this.refreshCookie.write(res, response.refreshToken);

    return new RegisterOutputDTO(response);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 201, type: LoginOutputDTO })
  async login(
    @Body() body: LoginInputDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.loginUseCase.execute(body);
    this.refreshCookie.write(res, response.refreshToken);

    return new LoginOutputDTO(response);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google OAuth login flow' })
  googleAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, type: OAuthOutputDTO })
  googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.completeOAuth(req, res);
  }

  @Get('apple')
  @Public()
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Start Apple OAuth login flow' })
  appleAuth() {}

  @Post('apple/callback')
  @Public()
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  @ApiResponse({ status: 200, type: OAuthOutputDTO })
  appleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.completeOAuth(req, res);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({
    summary:
      'Get a new access token from the refresh token cookie (rotates the cookie)',
  })
  @ApiResponse({ status: 200, type: RefreshTokenOutputDTO })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked or reused refresh token',
  })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.refreshCookie.read(req);
    if (!refreshToken) {
      throw new InvalidRefreshTokenException('Missing refresh token');
    }

    try {
      const response = await this.refreshTokenUseCase.execute({ refreshToken });
      this.refreshCookie.write(res, response.refreshToken);

      return new RefreshTokenOutputDTO(response);
    } catch (error) {
      // A dead cookie is useless to the client: drop it so it stops being sent.
      if (error instanceof InvalidRefreshTokenException) {
        this.refreshCookie.clear(res);
      }
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(204)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({
    summary: 'End the session: revoke the refresh token and clear the cookie',
  })
  @ApiNoContentResponse()
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.logoutUseCase.execute({
      refreshToken: this.refreshCookie.read(req),
    });
    this.refreshCookie.clear(res);
  }

  private completeOAuth(req: Request, res: Response): OAuthOutputDTO {
    const response = req.user as unknown as OAuthResponse;
    this.refreshCookie.write(res, response.refreshToken);

    return new OAuthOutputDTO(response);
  }
}
