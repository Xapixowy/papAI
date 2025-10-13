import { Injectable, UseGuards } from '@nestjs/common';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  type SlashCommandContext,
  Subcommand,
} from 'necord';
import { SONARR_COMMANDS_CONFIG } from '../configs/sonarr-commands.config';
import { RequiresDiscordUserRole } from '../decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { BaseCommandsController } from './base-commands.controller';

const SonarrCommandDecorator = createCommandGroupDecorator({
  name: SONARR_COMMANDS_CONFIG.name,
  description: SONARR_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@SonarrCommandDecorator()
export class SonarrCommandsController extends BaseCommandsController {
  constructor(private readonly sonarrCommandsService: SonarrCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand({
    name: SONARR_COMMANDS_CONFIG.commands.diskSpace.name,
    description: SONARR_COMMANDS_CONFIG.commands.diskSpace.description,
  })
  @RequiresDiscordUserRole(
    ...SONARR_COMMANDS_CONFIG.commands.diskSpace.userRoles,
  )
  public async onDiskSpaceCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.radarrCommandsService.diskSpaceHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: SONARR_COMMANDS_CONFIG.commands.currentDownloads.name,
    description: SONARR_COMMANDS_CONFIG.commands.currentDownloads.description,
  })
  @RequiresDiscordUserRole(
    ...SONARR_COMMANDS_CONFIG.commands.currentDownloads.userRoles,
  )
  public async onCurrentDownloadsCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.sonarrCommandsService.currentDownloadsHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
