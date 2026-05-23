import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger/app-logger.service';
import { CatchEverythingFilter } from './filters/CatchEverything.filter';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DomainExceptionFilter } from './filters/DomainException.filter';
import { AuthGuard } from '../modules/auth/guards/JwtAuth.guard';
import { AuthModule } from '../modules/auth/auth.module';
import { APP_LOGGER } from './constants/injection-tokens.constants';
import { ThrottlerGuard } from '@nestjs/throttler';

@Global()
@Module({
  imports: [AuthModule],
  providers: [
    AppLogger,
    { provide: APP_LOGGER, useClass: AppLogger },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
  exports: [AppLogger, APP_LOGGER],
})
export class CommonModule {}
