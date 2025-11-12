import { HUMAN_COMMANDS_CONFIG } from '@Constants/discord/human-commands.constant';
import { RequiresDiscordGuildFeature } from '@Decorators/requires-discord-guild-feature.decorator';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { PercentageOption } from '@Options/percentage.option';
import { RandomReplyPercentageCommandsService } from '@Services/discord/human/random-reply-percentage-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { HumanCommandDecorator } from '../human-commands.controller';

const RANDOM_REPLY_PERCENTAGE_COMMANDS_CONFIG =
  HUMAN_COMMANDS_CONFIG.commands.randomReplyPercentage;

@Injectable()
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.HUMAN)
@HumanCommandDecorator({
  name: RANDOM_REPLY_PERCENTAGE_COMMANDS_CONFIG.name,
  description: RANDOM_REPLY_PERCENTAGE_COMMANDS_CONFIG.description,
})
export class RandomReplyPercentageCommandsController extends BaseCommandsController {
  constructor(
    private readonly randomReplyPercentageCommandsService: RandomReplyPercentageCommandsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand(RANDOM_REPLY_PERCENTAGE_COMMANDS_CONFIG.commands.get)
  @RequiresDiscordUserRole(
    ...RANDOM_REPLY_PERCENTAGE_COMMANDS_CONFIG.commands.get.userRoles,
  )
  async onGetCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed =
      await this.randomReplyPercentageCommandsService.randomReplyPercentageGetHandler(
        guildId,
      );

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(RANDOM_REPLY_PERCENTAGE_COMMANDS_CONFIG.commands.set)
  @RequiresDiscordUserRole(
    ...RANDOM_REPLY_PERCENTAGE_COMMANDS_CONFIG.commands.set.userRoles,
  )
  public async onSetCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { percentage }: PercentageOption,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed =
      await this.randomReplyPercentageCommandsService.randomReplyPercentageSetHandler(
        {
          value: percentage,
          guildId,
        },
      );

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
