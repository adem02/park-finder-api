import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigType } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import appConfig from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.corsOrigin,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Server running in ${config.nodeEnv} mode on port ${config.port}`,
  );
}
bootstrap();
