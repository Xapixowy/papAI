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
import { RADARR_COMMANDS_CONFIG } from '../configs/radarr-commands.config';
import { RequiresDiscordUserRole } from '../decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { RadarrCommandsService } from '../services/radarr-commands.service';
import { BaseCommandsController } from './base-commands.controller';

const RadarrCommandDecorator = createCommandGroupDecorator({
  name: RADARR_COMMANDS_CONFIG.name,
  description: RADARR_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@RadarrCommandDecorator()
export class RadarrCommandsController extends BaseCommandsController {
  constructor(private readonly radarrCommandsService: RadarrCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand({
    name: RADARR_COMMANDS_CONFIG.commands.diskSpace.name,
    description: RADARR_COMMANDS_CONFIG.commands.diskSpace.description,
  })
  @RequiresDiscordUserRole(
    ...RADARR_COMMANDS_CONFIG.commands.diskSpace.userRoles,
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
    name: RADARR_COMMANDS_CONFIG.commands.currentDownloads.name,
    description: RADARR_COMMANDS_CONFIG.commands.currentDownloads.description,
  })
  @RequiresDiscordUserRole(
    ...RADARR_COMMANDS_CONFIG.commands.currentDownloads.userRoles,
  )
  public async onCurrentDownloadsCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.radarrCommandsService.currentDownloadsHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
