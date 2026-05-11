import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwtTokenService } from './services/JwtToken.service';
import { LoginUseCase } from '../../application/auth/Login.use-case';
import { RegisterUseCase } from '../../application/auth/Register.use-case';
import {
  CREDENTIALS_REPOSITORY,
  PASSWORD_SERVICE,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BcryptPasswordService } from './services/BcryptPassword.service';
import { AuthGuard } from './guards/JwtAuth.guard';
import { GoogleStrategy } from './strategies/Google.strategy';
import { AppleStrategy } from './strategies/Apple.strategy';
import { OAuthUseCase } from '../../application/auth/OAuth.use-case';
import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUser.repository';
import { PrismaCredentialsRepository } from '../../infrastructure/repositories/PrismaCredentials.repository';
import { RefreshTokenUseCase } from '../../application/auth/RefreshToken.use-case';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthGuard,
    GoogleStrategy,
    AppleStrategy,
    LoginUseCase,
    RegisterUseCase,
    RefreshTokenUseCase,
    OAuthUseCase,
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
    {
      provide: PASSWORD_SERVICE,
      useClass: BcryptPasswordService,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: CREDENTIALS_REPOSITORY,
      useClass: PrismaCredentialsRepository,
    },
  ],
  exports: [AuthGuard, TOKEN_SERVICE],
})
export class AuthModule {}
