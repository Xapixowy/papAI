import { HUMAN_COMMANDS_CONFIG } from '@Constants/discord/human-commands.constant';
import { RequiresDiscordGuildFeature } from '@Decorators/requires-discord-guild-feature.decorator';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { ContextSizeOption } from '@Options/context-size.option';
import { ContextSizeCommandsService } from '@Services/discord/human/context-size-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { HumanCommandDecorator } from '../human-commands.controller';

const CONTEXT_SIZE_COMMANDS_CONFIG = HUMAN_COMMANDS_CONFIG.commands.contextSize;

@Injectable()
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.HUMAN)
@HumanCommandDecorator({
  name: CONTEXT_SIZE_COMMANDS_CONFIG.name,
  description: CONTEXT_SIZE_COMMANDS_CONFIG.description,
})
export class ContextSizeCommandsController extends BaseCommandsController {
  constructor(
    private readonly contextSizeCommandsService: ContextSizeCommandsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand(CONTEXT_SIZE_COMMANDS_CONFIG.commands.get)
  @RequiresDiscordUserRole(
    ...CONTEXT_SIZE_COMMANDS_CONFIG.commands.get.userRoles,
  )
  public async onGetCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed =
      await this.contextSizeCommandsService.contextSizeGetHandler(guildId);

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(CONTEXT_SIZE_COMMANDS_CONFIG.commands.set)
  @RequiresDiscordUserRole(
    ...CONTEXT_SIZE_COMMANDS_CONFIG.commands.set.userRoles,
  )
  public async onSetCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { size }: ContextSizeOption,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed = await this.contextSizeCommandsService.contextSizeSetHandler({
      value: size,
      guildId,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
