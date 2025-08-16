import { z } from 'zod';

const envSchema = z.object({
  APP_PORT: z.coerce.number().int().positive(),
  DISCORD_BOT_TOKEN: z.string(),
  DISCORD_BOT_DEVELOPMENT_GUILD_ID: z.string(),
  GEMINI_API_KEY: z.string(),
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_DB: z.string(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, any>): Env {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment variable validation failed:', error.issues);
      process.exit(1);
    }
    throw error;
  }
}
