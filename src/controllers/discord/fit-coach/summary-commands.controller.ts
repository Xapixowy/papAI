import { FIT_COACH_COMMANDS_CONFIG } from '@Constants/discord/fit-coach-commands.constant';
import { FitCoachCommandDecorator } from '@Controllers/discord/fit-coach-commands.controller';
import { FitCoachSummaryOptions } from '@Options/fit-coach/fit-coach-summary.options';
import { Injectable } from '@nestjs/common';
import { FitCoachCommandsService } from '@Services/discord/fit-coach-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';

const SUMMARY_GROUP = FIT_COACH_COMMANDS_CONFIG.commands.summary;

@Injectable()
@FitCoachCommandDecorator({
  name: SUMMARY_GROUP.name,
  description: SUMMARY_GROUP.description,
})
export class FitCoachSummaryCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  constructor(
    private readonly fitCoachCommandsService: FitCoachCommandsService,
  ) {
    super();
  }

  @Subcommand(SUMMARY_GROUP.commands.day)
  async onDaySummary(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: FitCoachSummaryOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embeds = await this.fitCoachCommandsService.getDailySummaryForSlash(
      interaction.user.id,
      options.date,
    );

    await interaction.editReply({ embeds });
  }

  @Subcommand(SUMMARY_GROUP.commands.week)
  async onWeekSummary(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: FitCoachSummaryOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embeds = await this.fitCoachCommandsService.getPeriodSummaryForSlash(
      interaction.user.id,
      'week',
      options.date,
    );

    await interaction.editReply({ embeds });
  }

  @Subcommand(SUMMARY_GROUP.commands.month)
  async onMonthSummary(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: FitCoachSummaryOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embeds = await this.fitCoachCommandsService.getPeriodSummaryForSlash(
      interaction.user.id,
      'month',
      options.date,
    );

    await interaction.editReply({ embeds });
  }

  @Subcommand(SUMMARY_GROUP.commands.year)
  async onYearSummary(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: FitCoachSummaryOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embeds = await this.fitCoachCommandsService.getPeriodSummaryForSlash(
      interaction.user.id,
      'year',
      options.date,
    );

    await interaction.editReply({ embeds });
  }
}
