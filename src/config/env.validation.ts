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

  // Unused by the app itself (the real connection uses DATABASE_URL below),
  // kept optional only because docker-compose's local postgres service still
  // consumes these to configure its own container (POSTGRES_USER/PASSWORD/DB).
  @IsString()
  @IsOptional()
  DB_USER?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  DB_NAME?: string;

  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsNumber()
  @IsOptional()
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

  @IsString()
  CLOUDINARY_CLOUD_NAME!: string;

  @IsString()
  CLOUDINARY_API_KEY!: string;

  @IsString()
  CLOUDINARY_API_SECRET!: string;
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
