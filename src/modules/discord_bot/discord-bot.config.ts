import { EnvKey } from '@Enums/env-key.enum';
import { DynamicModule, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ColorResolvable, GatewayIntentBits } from 'discord.js';
import { NecordModule } from 'necord';
import { BotCommandsService } from './commands/bot-commands.service';
import { ChatgptCommandsService } from './commands/chatgpt-commands.service';
import { DiscordBotModule } from './discord-bot.module';

export const DISCORD_BOT_CONFIG: {
  botName: string;
  colors: {
    success: ColorResolvable;
    error: ColorResolvable;
    warning: ColorResolvable;
    info: ColorResolvable;
  };
} = {
  botName: 'PapAI',
  colors: {
    success: '#00ff00',
    error: '#ff0000',
    warning: '#ffff00',
    info: '#00ffff',
  },
};

export const DISCORD_BOT_INTENTS: GatewayIntentBits[] = [
  ...BotCommandsService.botIntents,
  ...ChatgptCommandsService.botIntents,
];

export const DISCORD_BOT_PROVIDERS: (DynamicModule | Type<DiscordBotModule>)[] =
  [
    NecordModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>(EnvKey.DISCORD_BOT_TOKEN)!,
        intents: DISCORD_BOT_INTENTS,
        development: [
          configService.get<string | undefined>(
            EnvKey.DISCORD_BOT_DEVELOPMENT_GUILD_ID,
          )!,
        ],
      }),
      inject: [ConfigService],
    }),
    DiscordBotModule,
  ];
