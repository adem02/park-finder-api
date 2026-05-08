import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  validateSync,
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

  // Database
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

  // Redis
  @IsString()
  REDIS_URL!: string;
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
