import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  baseUrl: string;
  corsOrigin: string;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
  }),
);
