import {
  FIT_COACH_ANALYZE_PHOTO_TOOL_NAME,
  FIT_COACH_GEMINI_TOOLS,
  FIT_COACH_GET_MEAL_LIST_TOOL_NAME,
  FIT_COACH_GET_PERIOD_SUMMARY_TOOL_NAME,
  FIT_COACH_LOOKUP_NUTRITION_BATCH_TOOL_NAME,
  FIT_COACH_LOOKUP_NUTRITION_TOOL_NAME,
  FIT_COACH_PROPOSE_MEAL_TOOL_NAME,
  FIT_COACH_SEARCH_MESSAGES_TOOL_NAME,
  FIT_COACH_SYSTEM_PROMPT,
} from '@Constants/discord/fit-coach-gemini-tools.constant';
import { DEFAULT_MEAL_TIME_RANGES } from '@Constants/fit-coach/meal-time-ranges.constant';
import { REGEX_HH_MM_TIME } from '@Constants/regex.constant';
import { MealTypeDecorator } from '@Decorators/pattern/meal-type.decorator';
import { FitCoachMealDto } from '@DTOs/fit-coach-meal.dto';
import { FitCoachUserSettings } from '@Entities/fit-coach-user-settings.entity';
import { MealType } from '@Enums/fit-coach/meal-type.enum';
import { ProviderToken } from '@Enums/provider-token.enum';
import { DiscordModalId } from '@Enums/discord/discord-modal-id.enum';
import { Part } from '@google/generative-ai';
import { Inject, Injectable } from '@nestjs/common';
import { GeminiService } from '@Services/api/gemini.service';
import { NutritionLookupService } from '@Services/api/nutrition-lookup.service';
import { FitCoachMealsService } from '@Services/fit-coach-meals.service';
import { FitCoachUserSettingsService } from '@Services/fit-coach-user-settings.service';
import { NutritionLookupResult } from '@Types/fit-coach/nutrition-lookup.type';
import {
  PendingMeal,
  PendingMealBreakdownItem,
} from '@Types/fit-coach/pending-meal.type';
import { MealTimeRanges } from '@Types/fit-coach/meal-time-ranges.type';
import { DiscordAttachmentsHelper } from '@Utils/helpers/discord-attachments.helper';
import { MarkdownHelper } from '@Utils/helpers/markdown.helper';
import {
  ActionRowBuilder,
  Attachment,
  ButtonBuilder,
  ButtonInteraction,
  ChatInputCommandInteraction,
  DMChannel,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { Redis } from 'ioredis';
import {
  LookupNutritionArgs,
  LookupNutritionBatchArgs,
  ProposeMealArgs,
  SearchUserMessagesArgs,
} from '@Types/fit-coach/gemini-tools.type';
import { FitCoachGeminiToolsService } from './fit-coach/gemini-tools.service';
import { FitCoachEmbedBuilderService } from './fit-coach/fit-coach-embed-builder.service';

const PENDING_MEAL_TTL = 600;
const DINNER_DURATION_HOURS = 4;

@Injectable()
export class FitCoachCommandsService {
  constructor(
    private readonly fitCoachMealsService: FitCoachMealsService,
    private readonly fitCoachUserSettingsService: FitCoachUserSettingsService,
    private readonly geminiService: GeminiService,
    private readonly nutritionLookupService: NutritionLookupService,
    private readonly fitCoachGeminiToolsService: FitCoachGeminiToolsService,
    private readonly embedBuilderService: FitCoachEmbedBuilderService,
    @Inject(ProviderToken.REDIS) private readonly redis: Redis,
  ) {}

  async handleDmMessage({
    userId,
    content,
    attachments,
    channel,
  }: {
    userId: string;
    content: string;
    attachments: Attachment[];
    channel: DMChannel;
  }): Promise<void> {
    await channel.sendTyping();
    await this.processWithGemini({ userId, content, attachments, channel });
  }

  async handleOnboardingUseDefaults(
    interaction: ButtonInteraction,
  ): Promise<void> {
    const userId = interaction.user.id;
    await interaction.deferUpdate();

    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);

    if (settingsResult.isErr()) {
      await this.fitCoachUserSettingsService.createWithDefaults(
        userId,
        'UTC',
        true,
      );
    } else {
      await this.fitCoachUserSettingsService.setOnboarded(
        userId,
        'UTC',
        DEFAULT_MEAL_TIME_RANGES,
      );
    }

    const embeds = this.embedBuilderService.simple({
      description:
        'Setup complete! Timezone set to **UTC** with default meal time ranges.\n\nYou can now start tracking your meals — just tell me what you ate!\n\nUse `/fit-coach settings configure` to change preferences anytime.',
      variant: 'success',
      title: '✅ FitCoach Ready!',
    });

    await interaction.editReply({ embeds, components: [] });
  }

  async handleOnboardingCustomize(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.deferUpdate();
    const { embeds, components } = this.embedBuilderService.timezoneInfo();
    await interaction.editReply({ embeds, components });
  }

  async handleOpenTimezoneModal(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const { embeds, components } = this.embedBuilderService.timezoneInfo();
    await interaction.editReply({ embeds, components });
  }

  async handleOpenTzForm(interaction: ButtonInteraction): Promise<void> {
    await interaction.showModal(this.buildTimezoneModal());
  }

  async handleOpenMealTimesModal(
    interaction: ButtonInteraction,
  ): Promise<void> {
    await interaction.showModal(this.buildMealTimesModal());
  }

  async handleTimezoneModalSubmit(
    interaction: ModalSubmitInteraction,
  ): Promise<void> {
    const userId = interaction.user.id;
    const timezone = interaction.fields.getTextInputValue('timezone').trim();

    if (!this.fitCoachUserSettingsService.isValidTimezone(timezone)) {
      const { embeds, components } =
        this.embedBuilderService.timezoneInfo(timezone);
      await interaction.reply({
        embeds,
        components,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);

    if (settingsResult.isErr()) {
      await this.fitCoachUserSettingsService.createWithDefaults(
        userId,
        timezone,
        false,
      );
    } else {
      await this.fitCoachUserSettingsService.update({
        ...FitCoachUserSettingsDto_from(settingsResult.value),
        timezone,
      });
    }

    const { embeds, components } = this.embedBuilderService.timezoneUpdated(
      timezone,
      true,
    );
    await interaction.reply({
      embeds,
      components,
      flags: [MessageFlags.Ephemeral],
    });
  }

  async handleMealTimesModalSubmit(
    interaction: ModalSubmitInteraction,
  ): Promise<void> {
    const userId = interaction.user.id;
    const t1 = interaction.fields.getTextInputValue('t_breakfast').trim();
    const t2 = interaction.fields
      .getTextInputValue('t_second_breakfast')
      .trim();
    const t3 = interaction.fields.getTextInputValue('t_lunch').trim();
    const t4 = interaction.fields.getTextInputValue('t_afternoon_snack').trim();
    const t5 = interaction.fields.getTextInputValue('t_dinner').trim();

    const validationError = this.validateMealTimeInputs(t1, t2, t3, t4, t5);
    if (validationError) {
      const { embeds, components } =
        this.embedBuilderService.mealTimesInfo(validationError);
      await interaction.reply({
        embeds,
        components,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const ranges = this.computeMealTimeRanges(t1, t2, t3, t4, t5);

    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);

    let timezone = 'UTC';

    if (settingsResult.isErr()) {
      await this.fitCoachUserSettingsService.createWithDefaults(
        userId,
        'UTC',
        false,
      );
    } else {
      timezone = settingsResult.value.timezone;
    }

    await this.fitCoachUserSettingsService.setOnboarded(
      userId,
      timezone,
      ranges,
    );

    await interaction.reply({
      embeds: this.embedBuilderService.mealTimesUpdated(ranges, timezone),
      flags: [MessageFlags.Ephemeral],
    });
  }

  async handleSettingsConfigure(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const { embeds, components } = this.embedBuilderService.configureMenu();
    await interaction.editReply({ embeds, components });
  }

  async handleSettingsTimezone(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const { embeds, components } = this.embedBuilderService.timezoneInfo();
    await interaction.editReply({ embeds, components });
  }

  async handleSettingsMealTimes(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const { embeds, components } = this.embedBuilderService.mealTimesInfo();
    await interaction.editReply({ embeds, components });
  }

  async handleMealConfirm(interaction: ButtonInteraction): Promise<void> {
    const userId = interaction.user.id;
    await interaction.deferUpdate();

    const pending = await this.getPendingMeal(userId);

    if (!pending) {
      const embeds = this.embedBuilderService.simple({
        description: 'Proposal expired. Please describe your meal again.',
        variant: 'error',
        title: 'Proposal Expired',
      });
      await interaction.editReply({ embeds, components: [] });
      return;
    }

    const breakdown = pending.breakdown ?? null;
    const portionGrams = breakdown
      ? breakdown.reduce((s, b) => s + b.portionGrams, 0)
      : null;

    const dto = new FitCoachMealDto({
      discordUserId: userId,
      mealType: pending.mealType,
      name: pending.name,
      calories: pending.calories,
      protein: pending.protein,
      fat: pending.fat,
      carbs: pending.carbs,
      mealAt: new Date(pending.mealAt),
      breakdown,
      portionGrams,
    });

    const result = await this.fitCoachMealsService.create(dto);
    await this.clearPendingMeal(userId);
    await this.redis.del(this.proposalMessageKey(userId));

    if (result.isErr()) {
      const embeds = this.embedBuilderService.simple({
        description: 'Failed to save the meal. Please try again.',
        variant: 'error',
      });
      await interaction.editReply({ embeds, components: [] });
      return;
    }

    const embeds = this.embedBuilderService.mealSaved(result.value);
    await interaction.editReply({ embeds, components: [] });
  }

  async handleMealReject(interaction: ButtonInteraction): Promise<void> {
    const userId = interaction.user.id;
    await interaction.deferUpdate();
    await this.clearPendingMeal(userId);
    await this.redis.del(this.proposalMessageKey(userId));
    const embeds = this.embedBuilderService.mealRejected();
    await interaction.editReply({ embeds, components: [] });
  }

  async handleMealRemoveSelect(
    interaction: StringSelectMenuInteraction,
    mealId: string,
  ): Promise<void> {
    const userId = interaction.user.id;
    await interaction.deferUpdate();

    const mealResult = await this.fitCoachMealsService.findById(mealId);

    if (mealResult.isErr()) {
      const embeds = this.embedBuilderService.simple({
        description: 'Meal not found.',
        variant: 'error',
      });
      await interaction.editReply({ embeds, components: [] });
      return;
    }

    if (mealResult.value.discordUserId !== userId) {
      const embeds = this.embedBuilderService.simple({
        description: 'You can only delete your own meals.',
        variant: 'error',
      });
      await interaction.editReply({ embeds, components: [] });
      return;
    }

    await this.setPendingRemovalMealId(userId, mealId);

    const { embeds, components } = this.embedBuilderService.mealRemoveConfirm(
      mealResult.value,
    );
    await interaction.editReply({ embeds, components });
  }

  async handleMealRemoveConfirm(interaction: ButtonInteraction): Promise<void> {
    const userId = interaction.user.id;
    await interaction.deferUpdate();

    const mealId = await this.getPendingRemovalMealId(userId);

    if (!mealId) {
      const embeds = this.embedBuilderService.simple({
        description: 'Session expired. Please run the remove command again.',
        variant: 'error',
      });
      await interaction.editReply({ embeds, components: [] });
      return;
    }

    const result = await this.fitCoachMealsService.deleteById(mealId, userId);
    await this.clearPendingRemovalMealId(userId);

    if (result.isErr()) {
      const embeds = this.embedBuilderService.simple({
        description: 'Meal not found or already deleted.',
        variant: 'error',
      });
      await interaction.editReply({ embeds, components: [] });
      return;
    }

    const embeds = this.embedBuilderService.simple({
      description: 'Meal deleted successfully.',
      variant: 'success',
      title: 'Meal Removed',
    });
    await interaction.editReply({ embeds, components: [] });
  }

  async handleMealRemoveCancel(interaction: ButtonInteraction): Promise<void> {
    const userId = interaction.user.id;
    await interaction.deferUpdate();
    await this.clearPendingRemovalMealId(userId);

    const embeds = this.embedBuilderService.simple({
      description: 'Deletion cancelled.',
      variant: 'info',
    });
    await interaction.editReply({ embeds, components: [] });
  }

  async getMealListForSlash(
    userId: string,
    dateStr?: string,
  ): Promise<{
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  }> {
    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);
    const settings = settingsResult.isOk()
      ? settingsResult.value
      : this.defaultSettings(userId);

    const date = dateStr ? new Date(`${dateStr}T12:00:00Z`) : new Date();
    const meals = await this.fitCoachMealsService.findByUserAndDay(
      userId,
      date,
      settings.timezone,
    );
    const localDate = this.fitCoachGeminiToolsService.toLocalDateString(
      date,
      settings.timezone,
    );

    await this.redis.set(
      this.listDateKey(userId),
      localDate,
      'EX',
      PENDING_MEAL_TTL,
    );
    return this.embedBuilderService.mealList(meals, localDate);
  }

  async handleMealRemoveShowSelect(
    interaction: ButtonInteraction,
  ): Promise<void> {
    const userId = interaction.user.id;
    await interaction.deferUpdate();

    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);
    const settings = settingsResult.isOk()
      ? settingsResult.value
      : this.defaultSettings(userId);

    const storedDate = await this.redis.get(this.listDateKey(userId));
    const date = storedDate ? new Date(`${storedDate}T12:00:00Z`) : new Date();
    const localDate =
      storedDate ??
      this.fitCoachGeminiToolsService.toLocalDateString(
        date,
        settings.timezone,
      );

    const meals = await this.fitCoachMealsService.findByUserAndDay(
      userId,
      date,
      settings.timezone,
    );

    if (meals.length === 0) {
      const embeds = this.embedBuilderService.simple({
        description: `No meals found for **${localDate}**.`,
        variant: 'info',
        title: 'Delete Meal',
      });
      await interaction.editReply({ embeds, components: [] });
      return;
    }

    const { embeds, components } =
      this.embedBuilderService.mealRemoveSelectMenu(meals, localDate);
    await interaction.editReply({ embeds, components });
  }

  async addMealViaGemini({
    userId,
    name,
    calories,
    protein,
    fat,
    carbs,
    mealType,
    dateStr,
    timeStr,
  }: {
    userId: string;
    name: string;
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    mealType?: MealType;
    dateStr?: string;
    timeStr?: string;
  }): Promise<{
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  }> {
    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);
    const settings = settingsResult.isOk()
      ? settingsResult.value
      : this.defaultSettings(userId);
    const now = new Date();

    const error = (msg: string) => ({
      embeds: this.embedBuilderService.simple({
        description: msg,
        variant: 'error' as const,
      }),
      components: [] as ActionRowBuilder<ButtonBuilder>[],
    });

    // Fast path: all macros provided — skip Gemini
    if (
      calories != null &&
      protein != null &&
      fat != null &&
      carbs != null
    ) {
      const proposeArgs: ProposeMealArgs = {
        name,
        calories,
        protein,
        fat,
        carbs,
        meal_type: mealType,
        date: dateStr,
        time: timeStr,
      };
      const pending = this.fitCoachGeminiToolsService.buildPendingMeal(
        proposeArgs,
        settings,
        now,
      );
      await this.setPendingMeal(userId, pending);
      return this.embedBuilderService.mealProposal(pending, 'Entered manually');
    }

    const systemPrompt = `${FIT_COACH_SYSTEM_PROMPT}\nUser timezone: ${settings.timezone}\nCurrent UTC time: ${now.toISOString()}\nCurrent local time: ${now.toLocaleString('en-GB', { timeZone: settings.timezone })}`;

    let queryText = `Log this meal: "${name}"`;
    if (mealType) queryText += `, meal type: ${mealType}`;
    if (dateStr) queryText += `, date: ${dateStr}`;
    if (timeStr) queryText += `, time: ${timeStr}`;
    if (calories != null) queryText += `, calories: ${calories} kcal`;
    if (protein != null) queryText += `, protein: ${protein}g`;
    if (fat != null) queryText += `, fat: ${fat}g`;
    if (carbs != null) queryText += `, carbs: ${carbs}g`;

    const firstResult = await this.geminiService.generateContentWithTools({
      systemPrompt,
      queryParts: [{ text: queryText }],
      tools: FIT_COACH_GEMINI_TOOLS,
    });

    if (firstResult.isErr()) return error('Something went wrong. Please try again.');

    const firstValue = firstResult.value;
    if ('text' in firstValue) return error('Could not process the meal. Please try again.');

    const [functionCall] = firstValue.functionCalls;

    const buildProposal = async (
      proposeArgs: ProposeMealArgs,
      breakdown?: PendingMealBreakdownItem[],
    ) => {
      if (mealType) proposeArgs.meal_type = mealType;
      if (dateStr) proposeArgs.date = dateStr;
      if (timeStr) proposeArgs.time = timeStr;
      const pending = this.fitCoachGeminiToolsService.buildPendingMeal(
        proposeArgs,
        settings,
        now,
      );
      if (breakdown) pending.breakdown = breakdown;
      await this.setPendingMeal(userId, pending);
      return this.embedBuilderService.mealProposal(pending, proposeArgs.confidence_note);
    };

    if (functionCall.name === FIT_COACH_PROPOSE_MEAL_TOOL_NAME) {
      return buildProposal(functionCall.args as ProposeMealArgs);
    }

    if (functionCall.name === FIT_COACH_LOOKUP_NUTRITION_TOOL_NAME) {
      const args = functionCall.args as LookupNutritionArgs;
      const lookupResult = await this.nutritionLookupService.lookup(
        args.query,
        args.portion_grams,
      );

      const functionResponse: object = lookupResult
        ? this.formatLookupResponse(lookupResult, args)
        : {
            found: false,
            note: 'No database match found. Estimate values and call propose_meal with a confidence_note.',
          };

      const secondResult =
        await this.geminiService.generateContentWithFunctionResponseAndTools({
          systemPrompt,
          queryParts: [{ text: queryText }],
          modelContent: firstValue.modelContent,
          functionCallName: FIT_COACH_LOOKUP_NUTRITION_TOOL_NAME,
          functionResponse,
          tools: FIT_COACH_GEMINI_TOOLS,
        });

      if (secondResult.isErr()) return error('Something went wrong. Please try again.');
      const secondValue = secondResult.value;
      if ('text' in secondValue) return error('Could not process the meal. Please try again.');

      const [secondCall] = secondValue.functionCalls;
      if (secondCall.name !== FIT_COACH_PROPOSE_MEAL_TOOL_NAME) return error('Unexpected response. Please try again.');

      const proposeArgs = secondCall.args as ProposeMealArgs;
      const breakdownItem: PendingMealBreakdownItem = lookupResult
        ? {
            name: lookupResult.name,
            portionGrams: lookupResult.portionGrams,
            calories: lookupResult.perPortion.calories,
            protein: lookupResult.perPortion.protein,
            fat: lookupResult.perPortion.fat,
            carbs: lookupResult.perPortion.carbs,
            found: true,
          }
        : {
            name: args.query.toUpperCase(),
            portionGrams: args.portion_grams,
            calories: Math.round(proposeArgs.calories),
            protein: Math.round(proposeArgs.protein * 10) / 10,
            fat: Math.round(proposeArgs.fat * 10) / 10,
            carbs: Math.round(proposeArgs.carbs * 10) / 10,
            found: false,
            estimated: true,
          };

      return buildProposal(proposeArgs, [breakdownItem]);
    }

    if (functionCall.name === FIT_COACH_LOOKUP_NUTRITION_BATCH_TOOL_NAME) {
      const args = functionCall.args as LookupNutritionBatchArgs;
      const batchResult = await this.nutritionLookupService.lookupBatch(
        args.components,
      );

      const foundItems = batchResult.components.filter((c) => c.found);
      const notFoundItems = batchResult.components.filter((c) => !c.found);
      const effectiveTotals = {
        calories: Math.round(foundItems.reduce((s, b) => s + b.calories, 0)),
        protein: Math.round(foundItems.reduce((s, b) => s + b.protein, 0) * 10) / 10,
        fat: Math.round(foundItems.reduce((s, b) => s + b.fat, 0) * 10) / 10,
        carbs: Math.round(foundItems.reduce((s, b) => s + b.carbs, 0) * 10) / 10,
      };

      const functionResponse =
        batchResult.found === 0
          ? {
              found: false,
              components: batchResult.components.map((c) => ({ name: c.name, portion_grams: c.portionGrams })),
              note: 'Nutrition databases unavailable. Estimate each component. Provide per-component estimates in estimated_components of propose_meal.',
            }
          : {
              found: foundItems.length,
              total: batchResult.components.length,
              meal_name: args.meal_name,
              sources: batchResult.sources,
              db_totals: effectiveTotals,
              not_found: notFoundItems.length > 0
                ? {
                    components: notFoundItems.map((c) => ({ name: c.name, portion_grams: c.portionGrams })),
                    instruction: `${notFoundItems.length} component(s) not found. Estimate their nutrition. Add to db_totals for totals in propose_meal. Provide per-component estimates in estimated_components.`,
                  }
                : undefined,
              confidence_note: `Values from ${batchResult.sources.join(' & ')} (${foundItems.length}/${batchResult.components.length} components found)`,
            };

      const secondResult =
        await this.geminiService.generateContentWithFunctionResponseAndTools({
          systemPrompt,
          queryParts: [{ text: queryText }],
          modelContent: firstValue.modelContent,
          functionCallName: FIT_COACH_LOOKUP_NUTRITION_BATCH_TOOL_NAME,
          functionResponse,
          tools: FIT_COACH_GEMINI_TOOLS,
        });

      if (secondResult.isErr()) return error('Something went wrong. Please try again.');
      const secondValue = secondResult.value;
      if ('text' in secondValue) return error('Could not process the meal. Please try again.');

      const [secondCall] = secondValue.functionCalls;
      if (secondCall.name !== FIT_COACH_PROPOSE_MEAL_TOOL_NAME) return error('Unexpected response. Please try again.');

      const proposeArgs = secondCall.args as ProposeMealArgs;
      const estimatedComponents = proposeArgs.estimated_components ?? [];
      let estimatedIdx = 0;

      const breakdown: PendingMealBreakdownItem[] = batchResult.components.map((c) => {
        if (c.found) {
          return { name: c.name, portionGrams: c.portionGrams, calories: c.calories, protein: c.protein, fat: c.fat, carbs: c.carbs, found: true };
        }
        if (estimatedIdx < estimatedComponents.length) {
          const est = estimatedComponents[estimatedIdx++];
          return { name: c.name, portionGrams: c.portionGrams, calories: Math.round(est.calories), protein: Math.round(est.protein * 10) / 10, fat: Math.round(est.fat * 10) / 10, carbs: Math.round(est.carbs * 10) / 10, found: false, estimated: true };
        }
        return { name: c.name, portionGrams: c.portionGrams, calories: 0, protein: 0, fat: 0, carbs: 0, found: false };
      });

      proposeArgs.calories = Math.round(breakdown.reduce((s, b) => s + b.calories, 0));
      proposeArgs.protein = Math.round(breakdown.reduce((s, b) => s + b.protein, 0) * 10) / 10;
      proposeArgs.fat = Math.round(breakdown.reduce((s, b) => s + b.fat, 0) * 10) / 10;
      proposeArgs.carbs = Math.round(breakdown.reduce((s, b) => s + b.carbs, 0) * 10) / 10;

      return buildProposal(proposeArgs, breakdown);
    }

    return error('Unexpected response. Please try again.');
  }

  async addMealManual({
    userId,
    name,
    calories,
    protein,
    fat,
    carbs,
    mealType,
    dateStr,
    timeStr,
  }: {
    userId: string;
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    mealType?: MealType;
    dateStr?: string;
    timeStr?: string;
  }): Promise<EmbedBuilder[]> {
    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);
    const settings = settingsResult.isOk()
      ? settingsResult.value
      : this.defaultSettings(userId);

    const now = new Date();
    let mealAt: Date;

    if (dateStr && timeStr) {
      mealAt = new Date(`${dateStr}T${timeStr}:00`);
    } else if (dateStr) {
      mealAt = new Date(
        `${dateStr}T${now.toLocaleTimeString('en-GB', { timeZone: settings.timezone, hour: '2-digit', minute: '2-digit' })}:00`,
      );
    } else {
      mealAt = now;
    }

    const resolvedMealType =
      mealType ??
      this.fitCoachGeminiToolsService.inferMealType(mealAt, settings);

    const dto = new FitCoachMealDto({
      discordUserId: userId,
      mealType: resolvedMealType,
      name,
      calories,
      protein,
      fat,
      carbs,
      mealAt,
    });

    const result = await this.fitCoachMealsService.create(dto);

    if (result.isErr()) {
      return this.embedBuilderService.simple({
        description: 'Failed to save the meal. Please try again.',
        variant: 'error',
      });
    }

    return this.embedBuilderService.mealSaved(result.value);
  }

  async getDailySummaryForSlash(
    userId: string,
    dateStr?: string,
  ): Promise<EmbedBuilder[]> {
    return this.getPeriodSummaryForSlash(userId, 'day', dateStr);
  }

  async getPeriodSummaryForSlash(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year',
    dateStr?: string,
  ): Promise<EmbedBuilder[]> {
    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);
    const settings = settingsResult.isOk()
      ? settingsResult.value
      : this.defaultSettings(userId);

    const result = await this.fitCoachGeminiToolsService.handlePeriodSummary(
      userId,
      settings,
      { period, date: dateStr },
    );

    let insight: string | undefined;
    if (period === 'day' && result.data.mealCount > 0) {
      const { totalCalories, totalProtein, totalFat, totalCarbs, totalGrams, mealCount } =
        result.data;
      const insightResult = await this.geminiService.generateContent({
        systemPrompt: FIT_COACH_SYSTEM_PROMPT,
        queryParts: [
          {
            text: `Day nutrition data: ${mealCount} meal(s), ${Math.round(totalCalories)} kcal, protein ${totalProtein.toFixed(1)}g / fat ${totalFat.toFixed(1)}g / carbs ${totalCarbs.toFixed(1)}g, ${Math.round(totalGrams)}g total food weight. Write exactly ONE dry, cynical sentence (max 110 characters) commenting on today's nutrition. Reference the actual numbers or macro ratios. No greeting, no emoji, just the sentence.`,
          },
        ],
      });
      if (insightResult.isOk()) {
        insight = insightResult.value.trim().replace(/^["']|["']$/g, '');
      }
    }

    return this.embedBuilderService.periodSummary(
      result.data,
      result.period,
      result.label,
      insight,
    );
  }

  private readonly FIT_COACH_TOOLS_REQUIRING_ONBOARDING = new Set([
    FIT_COACH_LOOKUP_NUTRITION_TOOL_NAME,
    FIT_COACH_LOOKUP_NUTRITION_BATCH_TOOL_NAME,
    FIT_COACH_PROPOSE_MEAL_TOOL_NAME,
    FIT_COACH_ANALYZE_PHOTO_TOOL_NAME,
  ]);

  private async processWithGemini({
    userId,
    content,
    attachments,
    channel,
  }: {
    userId: string;
    content: string;
    attachments: Attachment[];
    channel: DMChannel;
  }): Promise<void> {
    const settingsResult =
      await this.fitCoachUserSettingsService.findByUserId(userId);
    const settings = settingsResult.isOk()
      ? settingsResult.value
      : this.defaultSettings(userId);
    const isOnboarded =
      settingsResult.isOk() && settingsResult.value.isOnboarded;
    const imageAttachments = DiscordAttachmentsHelper.filterImages(attachments);
    const imageParts =
      await DiscordAttachmentsHelper.convertImagesToGeminiParts(
        imageAttachments,
      );

    const queryParts: Part[] = [{ text: content }, ...imageParts];
    const now = new Date();

    const pendingMeal = await this.getPendingMeal(userId);
    const pendingMealBreakdownContext =
      pendingMeal?.breakdown && pendingMeal.breakdown.length > 0
        ? `\nComponent portions used:\n${pendingMeal.breakdown.map((b) => `  - ${b.name}: ~${b.portionGrams}g = ${b.found ? `${b.calories} kcal, ${b.protein}g P, ${b.fat}g F, ${b.carbs}g C (from DB)` : 'not found in DB'}`).join('\n')}`
        : '';
    const pendingMealDate = pendingMeal
      ? new Intl.DateTimeFormat('en-CA', {
          timeZone: settings.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(pendingMeal.mealAt))
      : '';
    const pendingMealContext = pendingMeal
      ? `\n\nCURRENT PENDING MEAL PROPOSAL (shown to user, not yet saved):
Name: ${pendingMeal.name}
Calories: ${pendingMeal.calories} kcal | Protein: ${pendingMeal.protein}g | Fat: ${pendingMeal.fat}g | Carbs: ${pendingMeal.carbs}g
Meal type: ${pendingMeal.mealType}
Meal date (YYYY-MM-DD, local): ${pendingMealDate}${pendingMealBreakdownContext}

CORRECTION RULES — follow exactly.
KEY PRINCIPLE: The system automatically preserves the breakdown and recomputes totals server-side. You do NOT need to sum values manually — just call the right lookup tool, then propose_meal.
In ALL propose_meal calls: ALWAYS set name="${pendingMeal.name}", meal_type="${pendingMeal.mealType}", date="${pendingMealDate}". Never change name or meal_type unless explicitly asked.

1. User ADDS a missing ingredient (e.g. "there was also 150g beef"): call lookup_nutrition for ONLY the new ingredient. Then call propose_meal — the system merges it into the existing breakdown automatically.
2. User CORRECTS a portion of an existing ingredient (e.g. "the pasta was 200g not 150g"): call lookup_nutrition for ONLY that one item with the new grams. Then call propose_meal — the system replaces that item and recomputes totals.
3. User REPLACES one ingredient with a different food (e.g. "use Italian sausage instead of Polish kielbasa"): call lookup_nutrition_batch with the COMPLETE corrected component list — all previous items with the old one swapped for the new one. The system rebuilds the entire breakdown.
4. User says portions are generally wrong or wants full re-check: call lookup_nutrition_batch with the full corrected component list.
5. User states correct calorie count directly: call propose_meal with the stated calories, date="${pendingMealDate}".
6. User provides an exact time for the meal (e.g. "it was at 21:37"): call propose_meal with current totals, date="${pendingMealDate}", time="HH:MM".
7. User asks to retry / re-search items not found in DB: call lookup_nutrition_batch with ALL components (including already-found ones), not just the not-found subset.
8. User REMOVES an ingredient (e.g. "remove the bread", "without the sauce"): call lookup_nutrition_batch with ALL remaining components (current breakdown minus the removed one). The system rebuilds the breakdown without it.
IMPORTANT: If user says the breakdown is missing items — do NOT call list_meals. Call lookup_nutrition or lookup_nutrition_batch to look up the missing ingredient(s), then propose_meal.`
      : '';

    const systemPrompt = `${FIT_COACH_SYSTEM_PROMPT}

User timezone: ${settings.timezone}
Current UTC time: ${now.toISOString()}
Current local time: ${now.toLocaleString('en-GB', { timeZone: settings.timezone })}${pendingMealContext}`;

    const firstResult = await this.geminiService.generateContentWithTools({
      systemPrompt,
      queryParts,
      tools: FIT_COACH_GEMINI_TOOLS,
    });

    if (firstResult.isErr()) {
      await channel.send('Sorry, something went wrong. Please try again.');
      return;
    }

    const firstValue = firstResult.value;

    if ('text' in firstValue) {
      const pages = MarkdownHelper.splitMessageWithCodeAndPagination({
        text: firstValue.text,
        maxPageLength: 1800,
      });
      for (const page of pages) {
        await channel.send({ content: page });
      }
      return;
    }

    const [functionCall] = firstValue.functionCalls;

    if (
      this.FIT_COACH_TOOLS_REQUIRING_ONBOARDING.has(functionCall.name) &&
      !isOnboarded
    ) {
      if (settingsResult.isErr()) {
        await this.fitCoachUserSettingsService.createWithDefaults(userId);
      }
      const { embeds, components } = this.embedBuilderService.onboardingWelcome(
        this.embedBuilderService.formatDefaultRanges(),
      );
      await channel.send({ embeds, components });
      return;
    }

    if (functionCall.name === FIT_COACH_LOOKUP_NUTRITION_TOOL_NAME) {
      const args = functionCall.args as LookupNutritionArgs;
      const lookupResult = await this.nutritionLookupService.lookup(
        args.query,
        args.portion_grams,
      );

      const functionResponse: object = lookupResult
        ? this.formatLookupResponse(lookupResult, args)
        : {
            found: false,
            note: 'No database match found. Use your own nutritional knowledge to estimate values and include a confidence_note.',
          };

      await channel.sendTyping();
      const secondResult =
        await this.geminiService.generateContentWithFunctionResponseAndTools({
          systemPrompt,
          queryParts,
          modelContent: firstValue.modelContent,
          functionCallName: FIT_COACH_LOOKUP_NUTRITION_TOOL_NAME,
          functionResponse,
          tools: FIT_COACH_GEMINI_TOOLS,
        });

      if (secondResult.isErr()) {
        await channel.send('Sorry, something went wrong. Please try again.');
        return;
      }

      const secondValue = secondResult.value;

      if ('text' in secondValue) {
        const pages = MarkdownHelper.splitMessageWithCodeAndPagination({
          text: secondValue.text,
          maxPageLength: 1800,
        });
        for (const page of pages) {
          await channel.send({ content: page });
        }
        return;
      }

      const [secondCall] = secondValue.functionCalls;

      if (
        secondCall.name === FIT_COACH_PROPOSE_MEAL_TOOL_NAME ||
        secondCall.name === FIT_COACH_ANALYZE_PHOTO_TOOL_NAME
      ) {
        const proposeArgs = secondCall.args as ProposeMealArgs;
        const pending = this.fitCoachGeminiToolsService.buildPendingMeal(
          proposeArgs,
          settings,
          now,
        );
        const newItem: PendingMealBreakdownItem = lookupResult
          ? {
              name: lookupResult.name,
              portionGrams: lookupResult.portionGrams,
              calories: lookupResult.perPortion.calories,
              protein: lookupResult.perPortion.protein,
              fat: lookupResult.perPortion.fat,
              carbs: lookupResult.perPortion.carbs,
              found: true,
            }
          : {
              name: args.query.toUpperCase(),
              portionGrams: args.portion_grams,
              calories: Math.round(proposeArgs.calories),
              protein: Math.round(proposeArgs.protein * 10) / 10,
              fat: Math.round(proposeArgs.fat * 10) / 10,
              carbs: Math.round(proposeArgs.carbs * 10) / 10,
              found: false,
              estimated: true,
            };
        const existingBreakdown = pendingMeal?.breakdown ?? [];
        pending.breakdown =
          existingBreakdown.length > 0
            ? this.mergeBreakdownItem(existingBreakdown, newItem, args.query)
            : [newItem];
        await this.setPendingMeal(userId, pending);
        await this.sendProposal(
          userId,
          channel,
          pending,
          proposeArgs.confidence_note,
        );
      }

      return;
    }

    if (functionCall.name === FIT_COACH_LOOKUP_NUTRITION_BATCH_TOOL_NAME) {
      const args = functionCall.args as LookupNutritionBatchArgs;
      const batchResult = await this.nutritionLookupService.lookupBatch(
        args.components,
      );

      // Merge with existing breakdown when batch covers fewer items than current breakdown
      // (user retried not-found items or added a single component via batch)
      let mergedBreakdown: PendingMealBreakdownItem[] | undefined;
      if (
        pendingMeal?.breakdown &&
        pendingMeal.breakdown.length > 0 &&
        batchResult.total < pendingMeal.breakdown.length
      ) {
        let merged = [...pendingMeal.breakdown];
        for (let i = 0; i < batchResult.components.length; i++) {
          const c = batchResult.components[i];
          const query = args.components[i]?.query ?? c.name;
          merged = this.mergeBreakdownItem(
            merged,
            {
              name: c.name,
              portionGrams: c.portionGrams,
              calories: c.calories,
              protein: c.protein,
              fat: c.fat,
              carbs: c.carbs,
              found: c.found,
            },
            query,
          );
        }
        mergedBreakdown = merged;
      }

      const effectiveBreakdown =
        mergedBreakdown ??
        batchResult.components.map(
          (c): PendingMealBreakdownItem => ({
            name: c.name,
            portionGrams: c.portionGrams,
            calories: c.calories,
            protein: c.protein,
            fat: c.fat,
            carbs: c.carbs,
            found: c.found,
          }),
        );

      const foundInEffective = effectiveBreakdown.filter((b) => b.found);
      const effectiveTotals = {
        calories: Math.round(
          foundInEffective.reduce((s, b) => s + b.calories, 0),
        ),
        protein:
          Math.round(foundInEffective.reduce((s, b) => s + b.protein, 0) * 10) /
          10,
        fat:
          Math.round(foundInEffective.reduce((s, b) => s + b.fat, 0) * 10) / 10,
        carbs:
          Math.round(foundInEffective.reduce((s, b) => s + b.carbs, 0) * 10) /
          10,
      };

      const notFoundInEffective = effectiveBreakdown.filter((b) => !b.found);

      const functionResponse =
        batchResult.found === 0
          ? {
              found: false,
              components: effectiveBreakdown.map((b) => ({
                name: b.name,
                portion_grams: b.portionGrams,
              })),
              note: 'Nutrition databases unavailable. Estimate nutrition for each component using your knowledge. Add estimates to propose_meal totals. Provide per-component estimates in estimated_components of propose_meal.',
            }
          : {
              found: foundInEffective.length,
              total: effectiveBreakdown.length,
              meal_name: args.meal_name,
              sources: batchResult.sources,
              db_totals: effectiveTotals,
              not_found:
                notFoundInEffective.length > 0
                  ? {
                      components: notFoundInEffective.map((b) => ({
                        name: b.name,
                        portion_grams: b.portionGrams,
                      })),
                      instruction: `${notFoundInEffective.length} component(s) not found in databases. Estimate their nutrition using your knowledge. Add estimates to db_totals for the totals in propose_meal. Provide per-component estimates in estimated_components of propose_meal.`,
                    }
                  : undefined,
              confidence_note: `Values from ${batchResult.sources.join(' & ')} (${foundInEffective.length}/${effectiveBreakdown.length} components found)`,
            };

      await channel.sendTyping();
      const secondResult =
        await this.geminiService.generateContentWithFunctionResponseAndTools({
          systemPrompt,
          queryParts,
          modelContent: firstValue.modelContent,
          functionCallName: FIT_COACH_LOOKUP_NUTRITION_BATCH_TOOL_NAME,
          functionResponse,
          tools: FIT_COACH_GEMINI_TOOLS,
        });

      if (secondResult.isErr()) {
        await channel.send('Sorry, something went wrong. Please try again.');
        return;
      }

      const secondValue = secondResult.value;

      if ('text' in secondValue) {
        const pages = MarkdownHelper.splitMessageWithCodeAndPagination({
          text: secondValue.text,
          maxPageLength: 1800,
        });
        for (const page of pages) {
          await channel.send({ content: page });
        }
        return;
      }

      const [secondCall] = secondValue.functionCalls;

      if (secondCall.name === FIT_COACH_PROPOSE_MEAL_TOOL_NAME) {
        const proposeArgs = secondCall.args as ProposeMealArgs;
        const pending = this.fitCoachGeminiToolsService.buildPendingMeal(
          proposeArgs,
          settings,
          now,
        );

        const estimatedComponents = proposeArgs.estimated_components ?? [];
        let estimatedIdx = 0;
        const finalBreakdown = effectiveBreakdown.map((item) => {
          if (!item.found && estimatedIdx < estimatedComponents.length) {
            const est = estimatedComponents[estimatedIdx++];
            return {
              ...item,
              calories: Math.round(est.calories),
              protein: Math.round(est.protein * 10) / 10,
              fat: Math.round(est.fat * 10) / 10,
              carbs: Math.round(est.carbs * 10) / 10,
              estimated: true,
            };
          }
          return item;
        });

        pending.breakdown = finalBreakdown;
        // Recompute totals from full breakdown (includes DB values + estimates)
        pending.calories = Math.round(
          finalBreakdown.reduce((s, b) => s + b.calories, 0),
        );
        pending.protein =
          Math.round(finalBreakdown.reduce((s, b) => s + b.protein, 0) * 10) /
          10;
        pending.fat =
          Math.round(finalBreakdown.reduce((s, b) => s + b.fat, 0) * 10) / 10;
        pending.carbs =
          Math.round(finalBreakdown.reduce((s, b) => s + b.carbs, 0) * 10) / 10;
        await this.setPendingMeal(userId, pending);
        await this.sendProposal(
          userId,
          channel,
          pending,
          proposeArgs.confidence_note,
        );
      }

      return;
    }

    if (functionCall.name === FIT_COACH_ANALYZE_PHOTO_TOOL_NAME) {
      const args = functionCall.args as ProposeMealArgs & {
        portion_grams?: number;
        components?: Array<{ query: string; portion_grams: number }>;
      };

      let mergedArgs: ProposeMealArgs;

      let photoBreakdown: PendingMealBreakdownItem[] | undefined;

      if (args.components && args.components.length > 0) {
        const batchResult = await this.nutritionLookupService.lookupBatch(
          args.components,
        );

        const notFoundItems = batchResult.components.filter((c) => !c.found);
        const estimatedCalories = Math.max(
          0,
          (args.calories ?? 0) - batchResult.calories,
        );
        const estimatedProtein = Math.max(
          0,
          (args.protein ?? 0) - batchResult.protein,
        );
        const estimatedFat = Math.max(0, (args.fat ?? 0) - batchResult.fat);
        const estimatedCarbs = Math.max(
          0,
          (args.carbs ?? 0) - batchResult.carbs,
        );
        const totalNotFoundGrams = notFoundItems.reduce(
          (s, c) => s + c.portionGrams,
          0,
        );

        photoBreakdown = batchResult.components.map(
          (c): PendingMealBreakdownItem => {
            if (c.found) {
              return {
                name: c.name,
                portionGrams: c.portionGrams,
                calories: c.calories,
                protein: c.protein,
                fat: c.fat,
                carbs: c.carbs,
                found: true,
              };
            }
            const ratio =
              totalNotFoundGrams > 0 ? c.portionGrams / totalNotFoundGrams : 1;
            return {
              name: c.name,
              portionGrams: c.portionGrams,
              calories: Math.round(estimatedCalories * ratio),
              protein: Math.round(estimatedProtein * ratio * 10) / 10,
              fat: Math.round(estimatedFat * ratio * 10) / 10,
              carbs: Math.round(estimatedCarbs * ratio * 10) / 10,
              found: false,
              estimated: true,
            };
          },
        );

        mergedArgs =
          batchResult.found > 0
            ? {
                ...args,
                calories: batchResult.calories + Math.round(estimatedCalories),
                protein:
                  Math.round((batchResult.protein + estimatedProtein) * 10) /
                  10,
                fat: Math.round((batchResult.fat + estimatedFat) * 10) / 10,
                carbs:
                  Math.round((batchResult.carbs + estimatedCarbs) * 10) / 10,
                confidence_note:
                  notFoundItems.length > 0
                    ? `DB values for ${batchResult.found}/${batchResult.total} components; ${notFoundItems.length} estimated`
                    : `Values from ${batchResult.sources.join(' & ')} (${batchResult.found}/${batchResult.total} components found)`,
              }
            : {
                ...args,
                confidence_note:
                  'Nutrition databases unavailable — values are estimated',
              };
      } else {
        const portionGrams = args.portion_grams ?? 300;
        const lookupResult = await this.nutritionLookupService.lookup(
          args.name,
          portionGrams,
        );
        if (lookupResult) {
          photoBreakdown = [
            {
              name: lookupResult.name,
              portionGrams: lookupResult.portionGrams,
              calories: lookupResult.perPortion.calories,
              protein: lookupResult.perPortion.protein,
              fat: lookupResult.perPortion.fat,
              carbs: lookupResult.perPortion.carbs,
              found: true,
            },
          ];
          mergedArgs = {
            ...args,
            calories: lookupResult.perPortion.calories,
            protein: lookupResult.perPortion.protein,
            fat: lookupResult.perPortion.fat,
            carbs: lookupResult.perPortion.carbs,
            confidence_note: `Values from ${lookupResult.sources.join(' & ')} for ~${portionGrams}g`,
          };
        } else {
          photoBreakdown = [
            {
              name: args.name.toUpperCase(),
              portionGrams,
              calories: Math.round(args.calories ?? 0),
              protein: Math.round((args.protein ?? 0) * 10) / 10,
              fat: Math.round((args.fat ?? 0) * 10) / 10,
              carbs: Math.round((args.carbs ?? 0) * 10) / 10,
              found: false,
              estimated: true,
            },
          ];
          mergedArgs = {
            ...args,
            confidence_note:
              'Nutrition databases unavailable — values are estimated',
          };
        }
      }

      const pending = this.fitCoachGeminiToolsService.buildPendingMeal(
        mergedArgs,
        settings,
        now,
      );
      pending.breakdown = photoBreakdown;
      await this.setPendingMeal(userId, pending);
      await this.sendProposal(
        userId,
        channel,
        pending,
        mergedArgs.confidence_note,
      );
      return;
    }

    if (functionCall.name === FIT_COACH_PROPOSE_MEAL_TOOL_NAME) {
      const args = functionCall.args as ProposeMealArgs;
      const pending = this.fitCoachGeminiToolsService.buildPendingMeal(
        args,
        settings,
        now,
      );
      if (pendingMeal?.breakdown && pendingMeal.breakdown.length > 0) {
        pending.breakdown = pendingMeal.breakdown;
        const foundItems = pending.breakdown.filter((b) => b.found);
        if (foundItems.length > 0 && !args.calories) {
          pending.calories = Math.round(
            foundItems.reduce((s, b) => s + b.calories, 0),
          );
          pending.protein =
            Math.round(foundItems.reduce((s, b) => s + b.protein, 0) * 10) / 10;
          pending.fat =
            Math.round(foundItems.reduce((s, b) => s + b.fat, 0) * 10) / 10;
          pending.carbs =
            Math.round(foundItems.reduce((s, b) => s + b.carbs, 0) * 10) / 10;
        }
      }
      await this.setPendingMeal(userId, pending);
      await this.sendProposal(userId, channel, pending, args.confidence_note);
      return;
    }

    if (functionCall.name === FIT_COACH_SEARCH_MESSAGES_TOOL_NAME) {
      const args = functionCall.args as SearchUserMessagesArgs;
      const searchResult =
        await this.fitCoachGeminiToolsService.handleSearchUserMessages(
          userId,
          args,
        );

      await channel.sendTyping();
      const result =
        await this.geminiService.generateContentWithFunctionResponse({
          systemPrompt,
          queryParts,
          modelContent: firstValue.modelContent,
          functionCallName: functionCall.name,
          functionResponse: searchResult,
        });

      if (result.isErr()) {
        await channel.send('Could not search messages. Please try again.');
        return;
      }

      const pages = MarkdownHelper.splitMessageWithCodeAndPagination({
        text: result.value,
        maxPageLength: 1800,
      });
      for (const page of pages) {
        await channel.send({ content: page });
      }
      return;
    }

    if (functionCall.name === FIT_COACH_GET_MEAL_LIST_TOOL_NAME) {
      const args = functionCall.args as { date?: string };
      const { embeds, components } = await this.getMealListForSlash(
        userId,
        args.date,
      );
      await channel.send({ embeds, components });
      return;
    }

    if (functionCall.name === FIT_COACH_GET_PERIOD_SUMMARY_TOOL_NAME) {
      const args = functionCall.args as {
        period: 'day' | 'week' | 'month' | 'year';
        date?: string;
      };
      const embeds = await this.getPeriodSummaryForSlash(
        userId,
        args.period,
        args.date,
      );
      await channel.send({ embeds });
      return;
    }

    await channel.send('🤷');
  }

  private pendingMealKey(userId: string): string {
    return `fit_coach:pending:${userId}`;
  }

  private pendingRemovalKey(userId: string): string {
    return `fit_coach:removal:${userId}`;
  }

  private proposalMessageKey(userId: string): string {
    return `fit_coach:proposal_msg:${userId}`;
  }

  private listDateKey(userId: string): string {
    return `fit_coach:list_date:${userId}`;
  }

  async setPendingMeal(userId: string, meal: PendingMeal): Promise<void> {
    await this.redis.set(
      this.pendingMealKey(userId),
      JSON.stringify(meal),
      'EX',
      PENDING_MEAL_TTL,
    );
  }

  async getPendingMeal(userId: string): Promise<PendingMeal | null> {
    const raw = await this.redis.get(this.pendingMealKey(userId));
    return raw ? (JSON.parse(raw) as PendingMeal) : null;
  }

  async clearPendingMeal(userId: string): Promise<void> {
    await this.redis.del(this.pendingMealKey(userId));
  }

  async setPendingRemovalMealId(userId: string, mealId: string): Promise<void> {
    await this.redis.set(
      this.pendingRemovalKey(userId),
      mealId,
      'EX',
      PENDING_MEAL_TTL,
    );
  }

  async getPendingRemovalMealId(userId: string): Promise<string | null> {
    return this.redis.get(this.pendingRemovalKey(userId));
  }

  async clearPendingRemovalMealId(userId: string): Promise<void> {
    await this.redis.del(this.pendingRemovalKey(userId));
  }

  private defaultSettings(userId: string): FitCoachUserSettings {
    const s = new FitCoachUserSettings();
    s.discordUserId = userId;
    s.timezone = 'UTC';
    s.mealTimeRanges = DEFAULT_MEAL_TIME_RANGES;
    s.isOnboarded = true;
    return s;
  }

  private formatLookupResponse(
    result: NutritionLookupResult,
    args: LookupNutritionArgs,
  ): object {
    const portionDesc = args.portion_description ?? `${args.portion_grams}g`;
    return {
      found: true,
      sources: result.sources,
      food_name: result.name,
      portion: portionDesc,
      portion_grams: result.portionGrams,
      per_portion: {
        calories: result.perPortion.calories,
        protein: result.perPortion.protein,
        fat: result.perPortion.fat,
        carbs: result.perPortion.carbs,
      },
      per_100g: {
        calories: result.per100g.calories,
        protein: result.per100g.protein,
        fat: result.per100g.fat,
        carbs: result.per100g.carbs,
      },
      confidence_note: `Values from ${result.sources.join(' & ')} for ${portionDesc}`,
    };
  }

  private async sendProposal(
    userId: string,
    channel: DMChannel,
    pending: PendingMeal,
    confidenceNote?: string,
  ): Promise<void> {
    const oldMsgId = await this.redis.get(this.proposalMessageKey(userId));
    if (oldMsgId) {
      try {
        const oldMsg = await channel.messages.fetch(oldMsgId);
        await oldMsg.edit({ components: [] });
      } catch {
        // Message may be gone or too old
      }
    }

    const { embeds, components } = this.embedBuilderService.mealProposal(
      pending,
      confidenceNote,
    );
    const sent = await channel.send({ embeds, components });
    await this.redis.set(
      this.proposalMessageKey(userId),
      sent.id,
      'EX',
      PENDING_MEAL_TTL,
    );
  }

  private mergeBreakdownItem(
    existing: PendingMealBreakdownItem[],
    newItem: PendingMealBreakdownItem,
    query: string,
  ): PendingMealBreakdownItem[] {
    const queryLower = query.toLowerCase();
    const idx = existing.findIndex(
      (b) =>
        b.name.toLowerCase().includes(queryLower) ||
        queryLower.includes(b.name.toLowerCase()),
    );
    if (idx >= 0) {
      const updated = [...existing];
      updated[idx] = newItem;
      return updated;
    }
    return [...existing, newItem];
  }

  private buildTimezoneModal(): ModalBuilder {
    return new ModalBuilder()
      .setCustomId(DiscordModalId.FIT_COACH_TIMEZONE)
      .setTitle('Set Timezone')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('timezone')
            .setLabel('IANA Timezone (e.g. Europe/Warsaw)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(64)
            .setPlaceholder('Europe/Warsaw'),
        ),
      );
  }

  private buildMealTimesModal(): ModalBuilder {
    const makeInput = (customId: string, label: string, placeholder: string) =>
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(customId)
          .setLabel(label)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(5)
          .setMaxLength(5)
          .setPlaceholder(placeholder),
      );

    return new ModalBuilder()
      .setCustomId(DiscordModalId.FIT_COACH_MEAL_TIMES)
      .setTitle('Set Meal Times')
      .addComponents(
        makeInput('t_breakfast', '🌅 Breakfast start (HH:MM)', '06:00'),
        makeInput(
          't_second_breakfast',
          '☕ Second Breakfast start (HH:MM)',
          '10:00',
        ),
        makeInput('t_lunch', '☀️ Lunch start (HH:MM)', '12:00'),
        makeInput(
          't_afternoon_snack',
          '🍎 Afternoon Snack start (HH:MM)',
          '15:00',
        ),
        makeInput('t_dinner', '🌙 Dinner start (HH:MM)', '17:00'),
      );
  }

  private validateMealTimeInputs(
    t1: string,
    t2: string,
    t3: string,
    t4: string,
    t5: string,
  ): string | null {
    const timeRegex = REGEX_HH_MM_TIME;
    const times = [t1, t2, t3, t4, t5];

    if (!times.every((t) => timeRegex.test(t))) {
      return 'All times must be in HH:MM format (e.g. `06:00`, `17:30`).';
    }

    const toMins = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const [m1, m2, m3, m4, m5] = times.map(toMins);

    if (!(m1 < m2 && m2 < m3 && m3 < m4 && m4 < m5)) {
      const order = [
        MealType.BREAKFAST,
        MealType.SECOND_BREAKFAST,
        MealType.LUNCH,
        MealType.AFTERNOON_SNACK,
        MealType.DINNER,
      ]
        .map((t) => MealTypeDecorator.decorate(t))
        .join(' < ');
      return `Times must be in strict ascending order:\n${order}`;
    }

    return null;
  }

  private computeMealTimeRanges(
    t1: string,
    t2: string,
    t3: string,
    t4: string,
    t5: string,
  ): MealTimeRanges {
    const dinnerEnd = this.addHoursToTime(t5, DINNER_DURATION_HOURS);
    return {
      [MealType.BREAKFAST]: { start: t1, end: t2 },
      [MealType.SECOND_BREAKFAST]: { start: t2, end: t3 },
      [MealType.LUNCH]: { start: t3, end: t4 },
      [MealType.AFTERNOON_SNACK]: { start: t4, end: t5 },
      [MealType.DINNER]: { start: t5, end: dinnerEnd },
      [MealType.SNACK]: { start: dinnerEnd, end: t1 },
    };
  }

  private addHoursToTime(timeStr: string, hours: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = (h * 60 + m + hours * 60) % (24 * 60);
    const newH = Math.floor(totalMins / 60);
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  }
}

function FitCoachUserSettingsDto_from(entity: FitCoachUserSettings) {
  return {
    id: entity.id,
    discordUserId: entity.discordUserId,
    timezone: entity.timezone,
    mealTimeRanges: entity.mealTimeRanges,
    isOnboarded: entity.isOnboarded,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
