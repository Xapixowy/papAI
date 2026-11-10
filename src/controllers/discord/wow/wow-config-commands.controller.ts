import { Injectable, UseGuards } from '@nestjs/common';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { RequiresDiscordGuildFeature } from '@Decorators/nest/requires-discord-guild-feature.decorator';
import { RequiresDiscordUserRole } from '@Decorators/nest/requires-discord-user-role.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import {
  WowAllowedChannelOption,
  WowChannelOption,
} from '@Options/wow.options';
import { WowCommandsService } from '@Services/wow/wow-commands.service';
import {
  replyWow,
  WowCommand,
} from '@Controllers/discord/wow-commands.controller';

@Injectable()
@WowCommand({
  name: 'config',
  description: 'WoW notification configuration (bot administrators)',
})
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.WOW_FOREVER)
export class WowConfigCommandsController {
  constructor(private readonly commands: WowCommandsService) {}

  @Subcommand({
    name: 'character-channel',
    description: 'Allow or disable character observations on a channel',
  })
  @RequiresDiscordUserRole(DiscordUserRole.ADMIN)
  async characterChannel(
    @Context() [i]: SlashCommandContext,
    @Options() o: WowAllowedChannelOption,
  ): Promise<void> {
    await replyWow(this.commands, i, () =>
      this.commands.allowChannel(
        i.guildId!,
        i.user.id,
        o.channel.id,
        o.enabled,
      ),
    );
  }

  @Subcommand({
    name: 'status-channel',
    description: 'Set the channel for EU realm status and login reports',
  })
  @RequiresDiscordUserRole(DiscordUserRole.ADMIN)
  async statusChannel(
    @Context() [i]: SlashCommandContext,
    @Options() o: WowChannelOption,
  ): Promise<void> {
    await replyWow(this.commands, i, () =>
      this.commands.setStatusChannel(i.guildId!, i.user.id, o.channel.id),
    );
  }

  @Subcommand({
    name: 'status-disable',
    description:
      'Disable automatic EU realm status and login report notifications',
  })
  @RequiresDiscordUserRole(DiscordUserRole.ADMIN)
  async disable(@Context() [i]: SlashCommandContext): Promise<void> {
    await replyWow(this.commands, i, () =>
      this.commands.disableStatus(i.guildId!, i.user.id),
    );
  }
}
