import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import googleConfig from './config/google.config';
import appleConfig from './config/apple.config';
import cloudinaryConfig from './config/cloudinary.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './infrastructure/orm/prisma/prisma.module';
import { ParkingModule } from './modules/parking/parking.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    PrismaModule,
    ParkingModule,
    AuthModule,
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [
        databaseConfig,
        redisConfig,
        appConfig,
        jwtConfig,
        googleConfig,
        appleConfig,
        cloudinaryConfig,
      ],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
