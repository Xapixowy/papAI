import { validateEnv } from '@Configs/env.config';
import { EnvKey } from '@Enums/env-key.enum';
import { DiscordBotModule } from '@Modules/discord_bot/discord-bot.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
        host: configService.get<string>(EnvKey.POSTGRES_HOST)!,
        port: configService.get<number>(EnvKey.POSTGRES_PORT)!,
        username: configService.get<string>(EnvKey.POSTGRES_USER)!,
        password: configService.get<string>(EnvKey.POSTGRES_PASSWORD)!,
        database: configService.get<string>(EnvKey.POSTGRES_DB)!,
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
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    DiscordBotModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
