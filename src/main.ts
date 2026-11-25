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
import { loggerOptionsFromEnv } from './common/logger/logger-options';
import { requestLogging } from './common/logger/request-logging.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger(loggerOptionsFromEnv()),
  });
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const logger = new Logger('Bootstrap');

  const cors = buildCorsOptions(config.corsOrigin, config.nodeEnv);
  app.enableCors(cors.options);
  if (cors.allowsAnyOrigin) {
    logger.warn('CORS_ORIGIN=* : every origin is allowed (development only).');
  }

  app.use(requestLogging(new Logger('HTTP')));
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
    .setTitle('PlaceGratos')
    .setDescription('PlaceGratos API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE_NAME)
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
  // Time since the process started: on a cold start, how long the API itself took to be ready.
  logger.log(
    `Server running in ${config.nodeEnv} mode on port ${config.port}, ready ${Math.round(process.uptime() * 1000)} ms after start`,
  );
}
bootstrap().catch((error: unknown) => {
  // A failed startup (bad config, port in use...) must stop the process with a clear log.
  new Logger('Bootstrap').error(
    'Server failed to start',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
