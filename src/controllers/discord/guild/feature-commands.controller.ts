import { GUILD_COMMANDS_CONFIG } from '@Constants/discord/guild-commands.constant';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { FeatureOption } from '@Options/feature.option';
import { FeatureCommandsService } from '@Services/discord/guild/feature-commands.service';
import {
  CommandConfigCommand,
  CommandConfigGroup,
} from '@Types/discord/command-config.type';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { GuildCommandDecorator } from '../guild-commands.controller';

const FEATURE_COMMANDS_CONFIG = GUILD_COMMANDS_CONFIG.commands
  .feature as CommandConfigGroup<CommandConfigCommand>;

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
  @RequiresDiscordUserRole(...FEATURE_COMMANDS_CONFIG.commands.add.userRoles)
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
  @RequiresDiscordUserRole(...FEATURE_COMMANDS_CONFIG.commands.remove.userRoles)
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
