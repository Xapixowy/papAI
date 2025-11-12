import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { validateEnv } from './env-validation';

dotenv.config();
const validatedEnv = validateEnv(process.env);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(validatedEnv.APP_PORT);
}

bootstrap();
