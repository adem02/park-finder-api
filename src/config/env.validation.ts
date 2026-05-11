import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  validateSync,
  IsUUID,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Type } from 'class-transformer';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  BASE_URL: string = 'http://localhost:3000';

  @IsString()
  DB_USER!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_NAME!: string;

  @IsString()
  DB_HOST!: string;

  @IsNumber()
  @Type(() => Number)
  DB_PORT: number = 5432;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsUUID()
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN!: string;

  @IsString()
  GOOGLE_CLIENT_ID!: string;

  @IsString()
  GOOGLE_CLIENT_SECRET!: string;

  @IsString()
  GOOGLE_CALLBACK_URL!: string;

  @IsString()
  APPLE_CLIENT_ID!: string;

  @IsString()
  APPLE_TEAM_ID!: string;

  @IsString()
  APPLE_KEY_ID!: string;

  @IsString()
  APPLE_PRIVATE_KEY!: string;

  @IsString()
  APPLE_CALLBACK_URL!: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
