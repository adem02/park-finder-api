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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  @Post('register')
  @Public()
  async register(@Body() body: RegisterInputDTO) {
    const response = await this.registerUseCase.execute(body);

    return new RegisterOutputDTO(response);
  }

  @Post('login')
  @Public()
  async login(@Body() body: LoginInputDTO) {
    const response = await this.loginUseCase.execute(body);

    return new LoginOutputDTO(response);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request) {
    const response = req.user as OAuthResponse;

    return new OAuthOutputDTO(response);
  }

  @Get('apple')
  @Public()
  @UseGuards(AuthGuard('apple'))
  appleAuth() {}

  @Post('apple/callback')
  @Public()
  @UseGuards(AuthGuard('apple'))
  appleCallback(@Req() req: Request) {
    const response = req.user as OAuthResponse;

    return new OAuthOutputDTO(response);
  }

  @Post('refresh')
  async refreshToken(@GetUser() user: DecodedToken) {
    const response = await this.refreshTokenUseCase.execute({
      userId: user.userId,
    });

    return new RefreshTokenOutputDTO(response);
  }
}
