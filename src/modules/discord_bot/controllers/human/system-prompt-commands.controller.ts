import { HUMAN_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/human-commands.config';
import { RequiresDiscordUserRole } from '@Modules/discord_bot/decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { QueryOption } from '@Modules/discord_bot/options/query.option';
import { SystemPromptCommandsService } from '@Modules/discord_bot/services/human/system-prompt-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { HumanCommandDecorator } from '../human-commands.controller';

const SYSTEM_PROMPT_COMMANDS_CONFIG =
  HUMAN_COMMANDS_CONFIG.commands.systemPrompt;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
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

  @Subcommand({
    name: SYSTEM_PROMPT_COMMANDS_CONFIG.commands.get.name,
    description: SYSTEM_PROMPT_COMMANDS_CONFIG.commands.get.description,
  })
  @RequiresDiscordUserRole(
    ...SYSTEM_PROMPT_COMMANDS_CONFIG.commands.get.userRoles,
  )
  public async onSystemPromptGetCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const embed =
      await this.systemPromptCommandsService.systemPromptGetHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: SYSTEM_PROMPT_COMMANDS_CONFIG.commands.set.name,
    description: SYSTEM_PROMPT_COMMANDS_CONFIG.commands.set.description,
  })
  @RequiresDiscordUserRole(
    ...SYSTEM_PROMPT_COMMANDS_CONFIG.commands.set.userRoles,
  )
  public async onSystemPromptSetCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { query }: QueryOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.systemPromptCommandsService.systemPromptSetHandler(
      {
        systemPrompt: query,
      },
    );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
