import { EnvKey } from '@Enums/env-key.enum';
import { registerAs } from '@nestjs/config';

export default registerAs(
  'app',
  (): {
    version: string;
  } => ({
    version: process.env[EnvKey.APP_VERSION] || '0.0.0-dev',
  }),
);
