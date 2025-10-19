import { HUMAN_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/human-commands.config';
import { RequiresDiscordUserRole } from '@Modules/discord_bot/decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { QueryOption } from '@Modules/discord_bot/options/query.option';
import { HumanCommandsService } from '@Modules/discord_bot/services/human-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { HumanCommandDecorator } from '../human-commands.controller';

const CONFIG_COMMANDS_CONFIG = HUMAN_COMMANDS_CONFIG.commands.config;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@HumanCommandDecorator({
  name: CONFIG_COMMANDS_CONFIG.name,
  description: CONFIG_COMMANDS_CONFIG.description,
})
export class ConfigCommandsController extends BaseCommandsController {
  constructor(private readonly humanCommandsService: HumanCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand(CONFIG_COMMANDS_CONFIG.commands.getGMGIFQuery)
  @RequiresDiscordUserRole(
    ...CONFIG_COMMANDS_CONFIG.commands.getGMGIFQuery.userRoles,
  )
  public async onConfigGetGMGIFQueryCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.humanCommandsService.configGetGMGIFQueryHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: CONFIG_COMMANDS_CONFIG.commands.setGMGIFQuery.name,
    description: CONFIG_COMMANDS_CONFIG.commands.setGMGIFQuery.description,
  })
  @RequiresDiscordUserRole(
    ...CONFIG_COMMANDS_CONFIG.commands.setGMGIFQuery.userRoles,
  )
  public async onConfigSetGMGIFQueryCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { query }: QueryOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.humanCommandsService.configSetGMGIFQueryHandler({
      gmGifQuery: query,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
