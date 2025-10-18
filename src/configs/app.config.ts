import { registerAs } from '@nestjs/config';

export const APP_VERSION_KEY = 'APP_VERSION';

export default registerAs(
  'app',
  (): {
    version: string;
  } => ({
    version: process.env[APP_VERSION_KEY] || '0.0.0-dev',
  }),
);
