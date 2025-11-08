import { EnvKey } from '@Enums/env-key.enum';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayIntentBits } from 'discord.js';
import { NecordModule } from 'necord';
import { BaseCommandsModule } from './modules/base-commands.module';
import { BotCommandsModule } from './modules/bot-commands.module';
import { ChatgptCommandsModule } from './modules/chatgpt-commands.module';
import { GoodMorningCommandsModule } from './modules/good-morning-commands.module';
import { GuildCommandsModule } from './modules/guild-commands.module';
import { HumanCommandsModule } from './modules/human-commands.module';

@Module({
  imports: [
    NecordModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const developmentGuildId = configService.get<string | undefined>(
          EnvKey.DISCORD_BOT_DEVELOPMENT_GUILD_ID,
        );

        return {
          token: configService.get<string>(EnvKey.DISCORD_BOT_TOKEN)!,
          intents: DiscordBotModule.botIntents,
          development: developmentGuildId ? [developmentGuildId] : false,
        };
      },
      inject: [ConfigService],
    }),
    BotCommandsModule,
    ChatgptCommandsModule,
    GuildCommandsModule,
    GoodMorningCommandsModule,
    HumanCommandsModule,
  ],
})
export class DiscordBotModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...BotCommandsModule.botIntents,
      ...ChatgptCommandsModule.botIntents,
      ...GuildCommandsModule.botIntents,
      ...GoodMorningCommandsModule.botIntents,
      ...HumanCommandsModule.botIntents,
    ];
  }
}
