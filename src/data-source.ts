import { validateEnv } from '@Configs/env.config';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();
const validatedEnv = validateEnv(process.env);

const isTs = __filename.endsWith('.ts');

export default new DataSource({
  type: 'postgres',
  host: validatedEnv.POSTGRES_HOST,
  port: validatedEnv.POSTGRES_PORT,
  username: validatedEnv.POSTGRES_USER,
  password: validatedEnv.POSTGRES_PASSWORD,
  database: validatedEnv.POSTGRES_DB,
  entities: [
    isTs
      ? 'src/database/entities/**/*.entity.ts'
      : 'dist/database/entities/**/*.entity.js',
  ],
  migrations: [
    isTs
      ? 'src/database/migrations/**/*.ts'
      : 'dist/database/migrations/**/*.js',
  ],
  synchronize: false,
  logging: false,
});
