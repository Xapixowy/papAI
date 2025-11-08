import { GUILD_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/guild-comannds.config';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { FeatureOption } from '@Modules/discord_bot/options/feature.option';
import { FeatureCommandsService } from '@Modules/discord_bot/services/guild/feature-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { GuildCommandDecorator } from '../guild-commands.controller';

const FEATURE_COMMANDS_CONFIG = GUILD_COMMANDS_CONFIG.commands.feature;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@GuildCommandDecorator({
  name: FEATURE_COMMANDS_CONFIG.name,
  description: FEATURE_COMMANDS_CONFIG.description,
})
export class FeatureCommandsController extends BaseCommandsController {
  constructor(private readonly featureCommandsService: FeatureCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand(FEATURE_COMMANDS_CONFIG.commands.add)
  public async onAddFeatureCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { feature }: FeatureOption,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed = await this.featureCommandsService.addFeatureHandler({
      guildId,
      feature,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(FEATURE_COMMANDS_CONFIG.commands.remove)
  public async onRemoveFeatureCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { feature }: FeatureOption,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed = await this.featureCommandsService.removeFeatureHandler({
      guildId,
      feature,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
