import { EnvKey } from '@Enums/env-key.enum';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

const logger = new Logger('EnvValidation');

const envSchema = z.object({
  [EnvKey.APP_PORT]: z.coerce.number().int().positive(),
  [EnvKey.APP_TIMEZONE]: z.string(),
  [EnvKey.DISCORD_BOT_TOKEN]: z.string(),
  [EnvKey.DISCORD_BOT_DEVELOPMENT_GUILD_ID]: z.string().optional(),
  [EnvKey.GEMINI_API_KEY]: z.string(),
  [EnvKey.TENOR_API_KEY]: z.string(),
  [EnvKey.POSTGRES_HOST]: z.string(),
  [EnvKey.POSTGRES_PORT]: z.coerce.number().int().positive(),
  [EnvKey.POSTGRES_DB]: z.string(),
  [EnvKey.POSTGRES_USER]: z.string(),
  [EnvKey.POSTGRES_PASSWORD]: z.string(),
  [EnvKey.REDIS_HOST]: z.string(),
  [EnvKey.REDIS_PORT]: z.coerce.number().int().positive(),
  [EnvKey.STEAM_API_KEY]: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, any>): Env {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Environment variable validation failed:', error.issues);
      process.exit(1);
    }
    throw error;
  }
}
