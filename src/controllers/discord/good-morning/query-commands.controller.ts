import { GOOD_MORNING_COMMANDS_CONFIG } from '@Constants/discord/good-morning-commands.constant';
import { RequiresDiscordGuildFeature } from '@Decorators/requires-discord-guild-feature.decorator';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { QueryOption } from '@Options/query.option';
import { QueryCommandsService } from '@Services/discord/good-morning/query-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { GoodMorningCommandDecorator } from '../good-morning-commands.controller';

const QUERY_COMMANDS_CONFIG = GOOD_MORNING_COMMANDS_CONFIG.commands.query;

@Injectable()
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.GOOD_MORNING)
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
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed = await this.queryCommandsService.queryGetHandler(guildId);

    await interaction.reply({
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
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed = await this.queryCommandsService.querySetHandler({
      query,
      guildId,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
