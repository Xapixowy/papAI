import { GOOD_MORNING_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/good-morning-commands.config';
import { RequiresDiscordUserRole } from '@Modules/discord_bot/decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { QueryOption } from '@Modules/discord_bot/options/query.option';
import { QueryCommandsService } from '@Modules/discord_bot/services/good-morning/query-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { GoodMorningCommandDecorator } from '../good-morning-commands.controller';

const QUERY_COMMANDS_CONFIG = GOOD_MORNING_COMMANDS_CONFIG.commands.query;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@GoodMorningCommandDecorator({
  name: QUERY_COMMANDS_CONFIG.name,
  description: QUERY_COMMANDS_CONFIG.description,
})
export class QueryCommandsController extends BaseCommandsController {
  constructor(private readonly queryCommandsService: QueryCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand({
    name: QUERY_COMMANDS_CONFIG.commands.get.name,
    description: QUERY_COMMANDS_CONFIG.commands.get.description,
  })
  @RequiresDiscordUserRole(...QUERY_COMMANDS_CONFIG.commands.get.userRoles)
  public async onQueryGetCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.queryCommandsService.queryGetHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: QUERY_COMMANDS_CONFIG.commands.set.name,
    description: QUERY_COMMANDS_CONFIG.commands.set.description,
  })
  @RequiresDiscordUserRole(...QUERY_COMMANDS_CONFIG.commands.set.userRoles)
  public async onQuerySetCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { query }: QueryOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.queryCommandsService.querySetHandler({
      query,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
