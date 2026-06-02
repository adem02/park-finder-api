import { Controller, Get, Post, UseGuards, Req, Body } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RegisterInputDTO, RegisterOutputDTO } from './dto/Register.dto';
import { LoginInputDTO, LoginOutputDTO } from './dto/Login.dto';
import { RegisterUseCase } from '../../application/auth/Register.use-case';
import { LoginUseCase } from '../../application/auth/Login.use-case';
import type { OAuthResponse } from '../../application/auth/OAuth.use-case';
import { Public } from './decorators/public.decorator';
import { OAuthOutputDTO } from './dto/OAuth.dto';
import { RefreshTokenUseCase } from '../../application/auth/RefreshToken.use-case';
import { GetUser } from './decorators/get-user.decorator';
import type { DecodedToken } from '../../application/types/auth.types';
import { RefreshTokenOutputDTO } from './dto/RefreshToken.dto';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Throttle({ default: { ttl: 60000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, type: RegisterOutputDTO })
  async register(@Body() body: RegisterInputDTO) {
    const response = await this.registerUseCase.execute(body);

    return new RegisterOutputDTO(response);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, type: LoginOutputDTO })
  async login(@Body() body: LoginInputDTO) {
    const response = await this.loginUseCase.execute(body);

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
  googleCallback(@Req() req: Request) {
    const response = req.user as OAuthResponse;

    return new OAuthOutputDTO(response);
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
  appleCallback(@Req() req: Request) {
    const response = req.user as OAuthResponse;

    return new OAuthOutputDTO(response);
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token using a valid bearer token' })
  @ApiResponse({ status: 200, type: RefreshTokenOutputDTO })
  async refreshToken(@GetUser() user: DecodedToken) {
    const response = await this.refreshTokenUseCase.execute({
      userId: user.userId,
    });

    return new RefreshTokenOutputDTO(response);
  }
}
