import { EnvKey } from '@Enums/env-key.enum';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayIntentBits } from 'discord.js';
import { NecordModule } from 'necord';
import { BaseCommandsModule } from './discord/base-commands.module';
import { BotCommandsModule } from './discord/bot-commands.module';
import { ChatgptCommandsModule } from './discord/chatgpt-commands.module';
import { GoodMorningCommandsModule } from './discord/good-morning-commands.module';
import { GuildCommandsModule } from './discord/guild-commands.module';
import { HumanCommandsModule } from './discord/human-commands.module';

@Module({
  imports: [
    NecordModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const developmentGuildId = configService.get<string | undefined>(
          EnvKey.DISCORD_BOT_DEVELOPMENT_GUILD_ID,
        );

        return {
          token: configService.get<string>(EnvKey.DISCORD_BOT_TOKEN)!,
          intents: DiscordModule.botIntents,
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
export class DiscordModule extends BaseCommandsModule {
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
