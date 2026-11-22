import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  baseUrl: string;
  corsOrigin: string;
  /** PWA base URL: where social sign-in redirects the browser back to. */
  frontendUrl: string;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
    corsOrigin:
      process.env.CORS_ORIGIN ?? 'http://localhost:5190,http://localhost:4190',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5190',
  }),
);
