import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigType } from '@nestjs/config';
import { ConsoleLogger, ValidationPipe, Logger } from '@nestjs/common';
import appConfig from './config/app.config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { buildCorsOptions } from './config/cors';
import { REFRESH_COOKIE_NAME } from './config/auth.config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      timestamp: true,
      logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
    }),
  });
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const logger = new Logger('Bootstrap');

  const cors = buildCorsOptions(config.corsOrigin, config.nodeEnv);
  app.enableCors(cors.options);
  if (cors.allowsAnyOrigin) {
    logger.warn('CORS_ORIGIN=* : every origin is allowed (development only).');
  }

  app.use(cookieParser());

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Park Finder')
    .setDescription('Park Finder API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE_NAME)
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
}
bootstrap();
