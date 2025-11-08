import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { validateEnv } from 'src/env-validation';
import { AppModule } from './app.module';

dotenv.config();
const validatedEnv = validateEnv(process.env);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(validatedEnv.APP_PORT);
}

bootstrap();
