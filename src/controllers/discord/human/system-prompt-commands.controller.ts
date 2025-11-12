import { HUMAN_COMMANDS_CONFIG } from '@Constants/discord/human-commands.constant';
import { RequiresDiscordGuildFeature } from '@Decorators/requires-discord-guild-feature.decorator';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { QueryOption } from '@Options/query.option';
import { SystemPromptCommandsService } from '@Services/discord/human/system-prompt-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { HumanCommandDecorator } from '../human-commands.controller';

const SYSTEM_PROMPT_COMMANDS_CONFIG =
  HUMAN_COMMANDS_CONFIG.commands.systemPrompt;

@Injectable()
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.HUMAN)
@HumanCommandDecorator({
  name: SYSTEM_PROMPT_COMMANDS_CONFIG.name,
  description: SYSTEM_PROMPT_COMMANDS_CONFIG.description,
})
export class SystemPromptCommandsController extends BaseCommandsController {
  constructor(
    private readonly systemPromptCommandsService: SystemPromptCommandsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand(SYSTEM_PROMPT_COMMANDS_CONFIG.commands.get)
  @RequiresDiscordUserRole(
    ...SYSTEM_PROMPT_COMMANDS_CONFIG.commands.get.userRoles,
  )
  public async onSystemPromptGetCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed =
      await this.systemPromptCommandsService.systemPromptGetHandler(guildId);

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(SYSTEM_PROMPT_COMMANDS_CONFIG.commands.set)
  @RequiresDiscordUserRole(
    ...SYSTEM_PROMPT_COMMANDS_CONFIG.commands.set.userRoles,
  )
  public async onSystemPromptSetCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { query }: QueryOption,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed = await this.systemPromptCommandsService.systemPromptSetHandler(
      {
        systemPrompt: query,
        guildId,
      },
    );

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
