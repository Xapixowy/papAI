import { EnvKey } from '@Enums/env-key.enum';
import { registerAs } from '@nestjs/config';

export default registerAs(
  'gemini',
  (): {
    apiKey: string;
    modelNames: {
      textGeneration?: string;
      imageGeneration?: string;
      audioGeneration?: string;
    };
  } => ({
    apiKey: process.env[EnvKey.GEMINI_API_KEY]!,
    modelNames: {
      textGeneration: 'gemini-2.5-flash',
      imageGeneration: 'gemini-2.5-flash-image',
      audioGeneration: 'gemini-2.5-flash-audio',
    },
  }),
);
