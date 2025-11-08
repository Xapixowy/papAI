import { EnvKey } from '@Enums/env-key.enum';
import { registerAs } from '@nestjs/config';

export default registerAs(
  'gemini',
  (): {
    apiKey: string;
    modelName: string;
  } => ({
    apiKey: process.env[EnvKey.GEMINI_API_KEY]!,
    modelName: 'gemini-2.5-flash',
  }),
);
