import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigType } from '@nestjs/config';
import { ConsoleLogger, ValidationPipe, Logger } from '@nestjs/common';
import appConfig from './config/app.config';
import { HttpAdapterHost } from '@nestjs/core';
import helmet from 'helmet';
import { CatchEverythingFilter } from './common/filters/CatchEverything.filter';
import { DomainExceptionFilter } from './common/filters/DomainException.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      timestamp: true,
      logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
    }),
  });
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const logger = new Logger('Bootstrap');
  const httpAdapter = app.get(HttpAdapterHost);

  app.enableCors({
    origin: config.corsOrigin,
  });

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(
    new CatchEverythingFilter(httpAdapter),
    new DomainExceptionFilter(),
  );

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
}
bootstrap();
