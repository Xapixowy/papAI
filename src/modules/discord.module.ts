import { EnvKey } from '@Enums/env-key.enum';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayIntentBits, Partials } from 'discord.js';
import { NecordModule } from 'necord';
import { AdminCommandsModule } from './discord/admin-commands.module';
import { BaseCommandsModule } from './discord/base-commands.module';
import { BotCommandsModule } from './discord/bot-commands.module';
import { ChangelogCommandsModule } from './discord/changelog-commands.module';
import { ChannelCommandsModule } from './discord/channel-commands.module';
import { ChatgptCommandsModule } from './discord/chatgpt-commands.module';
import { GoodMorningCommandsModule } from './discord/good-morning-commands.module';
import { GuildCommandsModule } from './discord/guild-commands.module';
import { HumanCommandsModule } from './discord/human-commands.module';
import { SteamCommandsModule } from './discord/steam-commands.module';
import { RemindersCommandsModule } from './discord/reminders-commands.module';
import { MessageRouterModule } from './discord/message-router.module';

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
          partials: [Partials.Channel, Partials.Message],
          development: developmentGuildId ? [developmentGuildId] : false,
        };
      },
      inject: [ConfigService],
    }),
    AdminCommandsModule,
    BotCommandsModule,
    ChangelogCommandsModule,
    ChannelCommandsModule,
    ChatgptCommandsModule,
    GuildCommandsModule,
    GoodMorningCommandsModule,
    HumanCommandsModule,
    SteamCommandsModule,
    RemindersCommandsModule,
    MessageRouterModule,
  ],
})
export class DiscordModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...AdminCommandsModule.botIntents,
      ...BotCommandsModule.botIntents,
      ...ChangelogCommandsModule.botIntents,
      ...ChannelCommandsModule.botIntents,
      ...ChatgptCommandsModule.botIntents,
      ...GuildCommandsModule.botIntents,
      ...GoodMorningCommandsModule.botIntents,
      ...HumanCommandsModule.botIntents,
      ...SteamCommandsModule.botIntents,
      ...RemindersCommandsModule.botIntents,
      ...MessageRouterModule.botIntents,
    ];
  }
}
