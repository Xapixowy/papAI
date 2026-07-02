import { FIT_COACH_COMMANDS_CONFIG } from '@Constants/discord/fit-coach-commands.constant';
import { FitCoachCommandDecorator } from '@Controllers/discord/fit-coach-commands.controller';
import { Injectable } from '@nestjs/common';
import { FitCoachCommandsService } from '@Services/discord/fit-coach-commands.service';
import { ChatInputCommandInteraction, GatewayIntentBits } from 'discord.js';
import { Context, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';

const SETTINGS_GROUP = FIT_COACH_COMMANDS_CONFIG.commands.settings;

@Injectable()
@FitCoachCommandDecorator({
  name: SETTINGS_GROUP.name,
  description: SETTINGS_GROUP.description,
})
export class FitCoachSettingsCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  constructor(
    private readonly fitCoachCommandsService: FitCoachCommandsService,
  ) {
    super();
  }

  @Subcommand(SETTINGS_GROUP.commands.timezone)
  async onSetTimezone(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleSettingsTimezone(
      interaction as ChatInputCommandInteraction,
    );
  }

  @Subcommand(SETTINGS_GROUP.commands.mealTimes)
  async onSetMealTimes(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleSettingsMealTimes(
      interaction as ChatInputCommandInteraction,
    );
  }

  @Subcommand(SETTINGS_GROUP.commands.configure)
  async onConfigure(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleSettingsConfigure(
      interaction as ChatInputCommandInteraction,
    );
  }
}
