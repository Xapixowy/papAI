import { FIT_COACH_COMMANDS_CONFIG } from '@Constants/discord/fit-coach-commands.constant';
import { FitCoachCommandDecorator } from '@Controllers/discord/fit-coach-commands.controller';
import { FitCoachMealAddOptions } from '@Options/fit-coach/fit-coach-meal-add.options';
import { FitCoachMealListOptions } from '@Options/fit-coach/fit-coach-meal-list.options';
import { FitCoachMealRemoveOptions } from '@Options/fit-coach/fit-coach-meal-remove.options';
import { Injectable } from '@nestjs/common';
import { FitCoachCommandsService } from '@Services/discord/fit-coach-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';

const MEAL_GROUP = FIT_COACH_COMMANDS_CONFIG.commands.meal;

@Injectable()
@FitCoachCommandDecorator({
  name: MEAL_GROUP.name,
  description: MEAL_GROUP.description,
})
export class FitCoachMealCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  constructor(
    private readonly fitCoachCommandsService: FitCoachCommandsService,
  ) {
    super();
  }

  @Subcommand(MEAL_GROUP.commands.add)
  async onAddMeal(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: FitCoachMealAddOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const { embeds, components } =
      await this.fitCoachCommandsService.addMealViaGemini({
        userId: interaction.user.id,
        name: options.name,
        calories: options.calories,
        protein: options.protein,
        fat: options.fat,
        carbs: options.carbs,
        mealType: options.mealType,
        dateStr: options.date,
        timeStr: options.time,
      });

    await interaction.editReply({ embeds, components });
  }

  @Subcommand(MEAL_GROUP.commands.list)
  async onListMeals(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: FitCoachMealListOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const { embeds, components } =
      await this.fitCoachCommandsService.getMealListForSlash(
        interaction.user.id,
        options.date,
      );

    await interaction.editReply({ embeds, components });
  }

  @Subcommand(MEAL_GROUP.commands.remove)
  async onRemoveMeal(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: FitCoachMealRemoveOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const { embeds, components } =
      await this.fitCoachCommandsService.getMealListForSlash(
        interaction.user.id,
        options.date,
      );

    await interaction.editReply({ embeds, components });
  }
}
