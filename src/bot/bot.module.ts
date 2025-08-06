import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotGateway } from './bot.gateway';

@Module({
  imports: [ConfigModule],
  providers: [BotGateway],
})
export class BotModule {}
