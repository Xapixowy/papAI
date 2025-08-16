import { validateEnv } from '@Configs/env.config';
import { DISCORD_BOT_PROVIDERS } from '@Modules/discord_bot/discord-bot.config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => validateEnv(config),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST')!,
        port: configService.get<number>('POSTGRES_PORT')!,
        username: configService.get<string>('POSTGRES_USER')!,
        password: configService.get<string>('POSTGRES_PASSWORD')!,
        database: configService.get<string>('POSTGRES_DB')!,
        entities: [
          join(__dirname, 'database', 'entities', '**/*.entity.{ts,js}'),
        ],
        synchronize: false,
        extra: {
          options: '-c timezone=UTC',
        },
      }),
      inject: [ConfigService],
    }),
    ...DISCORD_BOT_PROVIDERS,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
