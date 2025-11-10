import { GUILD_COMMANDS_CONFIG } from '@Constants/discord/guild-commands.constant';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { GuildCommandsService } from '@Services/discord/guild-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  type SlashCommandContext,
  Subcommand,
} from 'necord';
import { BaseCommandsController } from './base-commands.controller';

export const GuildCommandDecorator = createCommandGroupDecorator({
  name: GUILD_COMMANDS_CONFIG.name,
  description: GUILD_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@GuildCommandDecorator()
export class GuildCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [];
  }

  constructor(private readonly guildCommandsService: GuildCommandsService) {
    super();
  }

  @Subcommand(GUILD_COMMANDS_CONFIG.commands.initialize)
  public async onInitializeCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guildId = interaction.guildId;
    const guildName = interaction.guild?.name ?? null;

    if (!guildId || !guildName) {
      return;
    }

    const embed = await this.guildCommandsService.initializeHandler({
      guildId,
      guildName,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: GUILD_COMMANDS_CONFIG.commands.list.name,
    description: GUILD_COMMANDS_CONFIG.commands.list.description,
  })
  public async onListCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const embed = await this.guildCommandsService.listHandler();

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
