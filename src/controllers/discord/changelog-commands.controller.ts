import { CHANGELOG_COMMAND_CONFIG } from '@Constants/discord/changelog-commands.constant';
import { Injectable } from '@nestjs/common';
import { ChangelogCommandsService } from '@Services/discord/changelog-commands.service';
import {
  GatewayIntentBits,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';
import { Context, SlashCommand, type SlashCommandContext } from 'necord';
import { BaseCommandsController } from './base-commands.controller';

@Injectable()
export class ChangelogCommandsController extends BaseCommandsController {
  constructor(
    private readonly changelogCommandsService: ChangelogCommandsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @SlashCommand({
    ...CHANGELOG_COMMAND_CONFIG,
    contexts: [
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ],
  })
  async onChangelog(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const embeds = this.changelogCommandsService.buildChangelogEmbeds();
    await interaction.reply({ embeds, flags: [MessageFlags.Ephemeral] });
  }
}
