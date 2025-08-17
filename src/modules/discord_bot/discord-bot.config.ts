import { DynamicModule, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ColorResolvable, GatewayIntentBits } from 'discord.js';
import { NecordModule } from 'necord';
import { InitializeCommandsService } from './commands/initialize-commands.service';
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
  ...InitializeCommandsService.botIntents,
];

export const DISCORD_BOT_PROVIDERS: (DynamicModule | Type<DiscordBotModule>)[] =
  [
    NecordModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('DISCORD_BOT_TOKEN')!,
        intents: DISCORD_BOT_INTENTS,
        development: [
          configService.get<string>('DISCORD_BOT_DEVELOPMENT_GUILD_ID')!,
        ],
      }),
      inject: [ConfigService],
    }),
    DiscordBotModule,
  ];
