import { DEFAULT_MEAL_TIME_RANGES } from '@Constants/fit-coach/meal-time-ranges.constant';
import { MealTypeDecorator } from '@Decorators/pattern/meal-type.decorator';
import { FitCoachMeal } from '@Entities/fit-coach-meal.entity';
import { DiscordButtonId } from '@Enums/discord/discord-button-id.enum';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { MealType } from '@Enums/fit-coach/meal-type.enum';
import { MealTimeRanges } from '@Types/fit-coach/meal-time-ranges.type';
import {
  PendingMeal,
  PendingMealBreakdownItem,
} from '@Types/fit-coach/pending-meal.type';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ColorResolvable,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class FitCoachEmbedBuilderService extends EmbedBuilderService {
  constructor(client: Client, configService: ConfigService) {
    super(client, configService);
  }

  mealProposal(
    pending: PendingMeal,
    confidenceNote?: string,
  ): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const label = MealTypeDecorator.decorate(pending.mealType);
    const breakdown: PendingMealBreakdownItem[] = pending.breakdown ?? [];
    const breakdownLines =
      breakdown.length >= 1
        ? [
            ``,
            `**Breakdown:**`,
            ...breakdown.flatMap((b: PendingMealBreakdownItem) =>
              b.found
                ? [
                    `- ${b.name} (\`~${b.portionGrams}g\`) — \`${b.calories} kcal\``,
                    `  - Protein: \`${b.protein}g\``,
                    `  - Fat: \`${b.fat}g\``,
                    `  - Carbs: \`${b.carbs}g\``,
                  ]
                : b.estimated
                  ? [
                      `- ${b.name} (\`~${b.portionGrams}g\`) — \`~${b.calories} kcal\` *(est.)*`,
                      `  - Protein: \`~${b.protein}g\``,
                      `  - Fat: \`~${b.fat}g\``,
                      `  - Carbs: \`~${b.carbs}g\``,
                    ]
                  : [
                      `- ${b.name} (\`~${b.portionGrams}g\`) — *not found in DB*`,
                    ],
            ),
          ]
        : [];

    const description = [
      `**${pending.name}**`,
      ``,
      `- Meal type: \`${label}\``,
      `- Date & time: \`${pending.mealAtLocal}\``,
      `- Calories: \`${pending.calories} kcal\``,
      `- Protein: \`${pending.protein}g\``,
      `- Fat: \`${pending.fat}g\``,
      `- Carbs: \`${pending.carbs}g\``,
      ...breakdownLines,
      confidenceNote ? `\n*${confidenceNote}*` : '',
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(this.configService.get<ColorResolvable>('discord.colors.info')!)
      .setTitle('Meal Proposal — Please Confirm')
      .setDescription(description)
      .setTimestamp()
      .setFooter(this.generateFooter());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_MEAL_CONFIRM)
        .setLabel('Save')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_MEAL_REJECT)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row] };
  }

  mealSaved(meal: FitCoachMeal): EmbedBuilder[] {
    const description = [
      `**${meal.name}** saved successfully!`,
      ``,
      `- Type: \`${MealTypeDecorator.decorate(meal.mealType)}\``,
      `- Calories: \`${meal.calories} kcal\``,
      `- Protein: \`${meal.protein}g\`  Fat: \`${meal.fat}g\`  Carbs: \`${meal.carbs}g\``,
    ].join('\n');

    return this.simple({
      description,
      variant: 'success',
      title: 'Meal Saved',
    });
  }

  mealRejected(): EmbedBuilder[] {
    return this.simple({
      description: 'Meal proposal rejected. Nothing was saved.',
      variant: 'info',
      title: 'Rejected',
    });
  }

  periodSummary(
    data: {
      totalCalories: number;
      totalProtein: number;
      totalFat: number;
      totalCarbs: number;
      totalGrams: number;
      mealCount: number;
    },
    period: string,
    label: string,
    insight?: string,
  ): EmbedBuilder[] {
    const title = `Meals summary (${period}) — ${label}`;

    if (data.mealCount === 0) {
      return this.simple({
        description: `No meals logged for this ${period}.`,
        variant: 'info',
        title,
      });
    }

    const avgCalories = Math.round(data.totalCalories / data.mealCount);
    const avgGrams = Math.round(data.totalGrams / data.mealCount);

    const proteinKcal = data.totalProtein * 4;
    const fatKcal = data.totalFat * 9;
    const carbsKcal = data.totalCarbs * 4;
    const macroKcal = proteinKcal + fatKcal + carbsKcal;
    const pct = (kcal: number) =>
      macroKcal > 0 ? `${Math.round((kcal / macroKcal) * 100)}%` : '—';

    const mealWord = data.mealCount === 1 ? 'meal' : 'meals';

    const lines = [
      `You ate \`${Math.round(data.totalCalories)} kcal\` across \`${data.mealCount}\` ${mealWord}, \`${Math.round(data.totalGrams)}g\` total.`,
      ``,
      `**Macros**`,
      `- 🥩 Protein: \`${data.totalProtein.toFixed(1)}g\` — \`${pct(proteinKcal)}\``,
      `- 🧈 Fat: \`${data.totalFat.toFixed(1)}g\` — \`${pct(fatKcal)}\``,
      `- 🌾 Carbs: \`${data.totalCarbs.toFixed(1)}g\` — \`${pct(carbsKcal)}\``,
      ``,
      `**Averages per meal**`,
      `- Calories: \`${avgCalories} kcal/meal\``,
      `- Portion: \`${avgGrams}g\``,
    ];

    if (insight) {
      lines.push(``, `*${insight}*`);
    }

    return this.simple({
      description: lines.join('\n'),
      variant: 'info',
      title,
    });
  }

  mealList(
    meals: FitCoachMeal[],
    date: string,
  ): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const title: string = `Meals — ${date}`;

    if (meals.length === 0) {
      return {
        embeds: this.simple({
          description: `No meals logged for **${date}**.`,
          variant: 'info',
          title,
        }),
        components: [],
      };
    }

    const mealSections: string[] = [];

    for (const mealType of Object.values(MealType)) {
      const typeMeals = meals.filter((m) => m.mealType === mealType);
      for (const m of typeMeals) {
        const gramStr =
          m.portionGrams !== null ? ` (\`~${m.portionGrams}g\`)` : '';
        mealSections.push(
          [
            `### ${MealTypeDecorator.decorate(mealType)}`,
            `**${m.name}**${gramStr} — \`${m.calories} kcal\``,
            `- Protein: \`${m.protein}g\``,
            `- Fat: \`${m.fat}g\``,
            `- Carbs: \`${m.carbs}g\``,
          ].join('\n'),
        );
      }
    }

    const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
    const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
    const totalFat = meals.reduce((s, m) => s + m.fat, 0);
    const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
    const totalGrams = meals.reduce((s, m) => s + (m.portionGrams ?? 0), 0);

    const summarySection = [
      `# Summary`,
      `You ate \`${totalCalories} kcal\` and your meals had \`${totalGrams}g\` total.`,
      `- Protein: \`${totalProtein.toFixed(1)}g\``,
      `- Fat: \`${totalFat.toFixed(1)}g\``,
      `- Carbs: \`${totalCarbs.toFixed(1)}g\``,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(this.configService.get<ColorResolvable>('discord.colors.info')!)
      .setTitle(title)
      .setDescription([...mealSections, summarySection].join('\n\n'))
      .setTimestamp()
      .setFooter(this.generateFooter());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_MEAL_REMOVE_SHOW_SELECT)
        .setLabel('Delete Meal')
        .setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row] };
  }

  mealRemoveSelectMenu(
    meals: FitCoachMeal[],
    date: string,
  ): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<StringSelectMenuBuilder>[];
  } {
    const options = meals.map((m) => {
      const emoji = MealTypeDecorator.emojis[m.mealType];
      const gramStr = m.portionGrams !== null ? ` / ${m.portionGrams}g` : '';
      const desc = `${m.calories} kcal${gramStr} / P:${m.protein}g / F:${m.fat}g / C:${m.carbs}g`;
      return new StringSelectMenuOptionBuilder()
        .setLabel(m.name)
        .setDescription(desc)
        .setEmoji(emoji)
        .setValue(m.id);
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId(DiscordSelectId.FIT_COACH_MEAL_REMOVE)
      .setPlaceholder('Select a meal to remove...')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      select,
    );

    return {
      embeds: this.simple({
        description: `Select a meal from **${date}** to delete:`,
        variant: 'info',
        title: 'Delete Meal',
      }),
      components: [row],
    };
  }

  mealRemoveConfirm(meal: FitCoachMeal): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const description = [
      `Are you sure you want to delete this meal?`,
      ``,
      `**${meal.name}** — \`${MealTypeDecorator.decorate(meal.mealType)}\` — \`${meal.calories} kcal\``,
      `P:\`${meal.protein}g\` · F:\`${meal.fat}g\` · C:\`${meal.carbs}g\``,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(
        this.configService.get<ColorResolvable>('discord.colors.warning')!,
      )
      .setTitle('Confirm Deletion')
      .setDescription(description)
      .setTimestamp()
      .setFooter(this.generateFooter());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_MEAL_REMOVE_CONFIRM)
        .setLabel('Delete')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_MEAL_REMOVE_CANCEL)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

    return { embeds: [embed], components: [row] };
  }

  onboardingWelcome(defaultRangesText: string): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const description = [
      `Welcome to **FitCoach**!`,
      ``,
      `I help you track your meals and nutrition directly through Discord DMs.`,
      ``,
      `- Timezone: \`UTC\` (default)`,
      ``,
      `**Default meal time ranges:**`,
      defaultRangesText,
      ``,
      `You can change these anytime with \`/fit-coach settings\`.`,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(
        this.configService.get<ColorResolvable>('discord.colors.success')!,
      )
      .setTitle('Welcome to FitCoach!')
      .setDescription(description)
      .setTimestamp()
      .setFooter(this.generateFooter());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_ONBOARDING_USE_DEFAULTS)
        .setLabel('Use defaults (UTC)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_ONBOARDING_CUSTOMIZE)
        .setLabel('Set my timezone')
        .setStyle(ButtonStyle.Secondary),
    );

    return { embeds: [embed], components: [row] };
  }

  timezoneInfo(invalidValue?: string): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const isError = invalidValue !== undefined;
    const infoLines = [
      'Enter a valid **IANA timezone** string.',
      '',
      '**Format:** `Region/City`',
      '**Examples:** `Europe/Warsaw` · `America/New_York` · `Asia/Tokyo`',
      '',
      '**Invalid formats (will be rejected):**',
      '`UTC+1` · `CET` · `GMT+2` · `Poland`',
      '',
      '**Find your timezone:**',
      'https://en.wikipedia.org/wiki/List_of_tz_database_time_zones',
      '*(TZ identifier column)*',
      '',
      'Click the button below or use `/fit-coach settings configure` to try again.',
    ];

    const description = isError
      ? [
          `\`${invalidValue}\` is not a valid IANA timezone.`,
          '',
          ...infoLines,
        ].join('\n')
      : infoLines.join('\n');

    const color = isError
      ? this.configService.get<ColorResolvable>('discord.colors.error')!
      : this.configService.get<ColorResolvable>('discord.colors.info')!;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(isError ? 'Invalid Timezone' : 'Set Timezone')
      .setDescription(description)
      .setTimestamp()
      .setFooter(this.generateFooter());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_CONFIGURE_OPEN_TZ_FORM)
        .setLabel('Open Timezone Form')
        .setStyle(ButtonStyle.Primary),
    );

    return { embeds: [embed], components: [row] };
  }

  mealTimesInfo(errorMessage?: string): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const isError = errorMessage !== undefined;
    const order = [
      MealType.BREAKFAST,
      MealType.SECOND_BREAKFAST,
      MealType.LUNCH,
      MealType.AFTERNOON_SNACK,
      MealType.DINNER,
    ]
      .map((t) => MealTypeDecorator.decorate(t))
      .join(' < ');

    const infoLines = [
      'Enter **start times** for 5 meal periods in `HH:MM` (24h) format.',
      '**Example:** `06:00` · `10:00` · `12:00` · `15:00` · `17:00`',
      '',
      '**Order (must be strictly ascending):**',
      order,
      '',
      `**${MealTypeDecorator.decorate(MealType.SNACK)}** is derived automatically`,
      `*(Dinner end + 4h → Breakfast start)*`,
      '',
      'Click the button below or use `/fit-coach settings configure` to try again.',
    ];

    const description = isError
      ? [errorMessage, '', ...infoLines].join('\n')
      : infoLines.join('\n');

    const color = isError
      ? this.configService.get<ColorResolvable>('discord.colors.error')!
      : this.configService.get<ColorResolvable>('discord.colors.info')!;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(isError ? 'Invalid Meal Times' : 'Set Meal Times')
      .setDescription(description)
      .setTimestamp()
      .setFooter(this.generateFooter());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_CONFIGURE_SET_MEAL_TIMES)
        .setLabel('Set Meal Times')
        .setStyle(ButtonStyle.Primary),
    );

    return { embeds: [embed], components: [row] };
  }

  configureMenu(): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const embed = new EmbedBuilder()
      .setColor(this.configService.get<ColorResolvable>('discord.colors.info')!)
      .setTitle('FitCoach Configuration')
      .setDescription(
        [
          'Configure your timezone and meal time ranges.',
          '',
          'You can set each independently.',
        ].join('\n'),
      )
      .setTimestamp()
      .setFooter(this.generateFooter());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_CONFIGURE_SET_TIMEZONE)
        .setLabel('Set Timezone')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.FIT_COACH_CONFIGURE_SET_MEAL_TIMES)
        .setLabel('Set Meal Times')
        .setStyle(ButtonStyle.Secondary),
    );

    return { embeds: [embed], components: [row] };
  }

  timezoneUpdated(
    timezone: string,
    withMealTimesButton = false,
  ): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const currentTime = new Date().toLocaleTimeString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    });

    const embed = new EmbedBuilder()
      .setColor(
        this.configService.get<ColorResolvable>('discord.colors.success')!,
      )
      .setTitle('Timezone Set')
      .setDescription(
        [
          `Timezone set to \`${timezone}\`.`,
          `Current time: \`${currentTime}\``,
          ...(withMealTimesButton
            ? ['', 'Now configure your meal time ranges:']
            : []),
        ].join('\n'),
      )
      .setTimestamp()
      .setFooter(this.generateFooter());

    const components: ActionRowBuilder<ButtonBuilder>[] = [];

    if (withMealTimesButton) {
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(DiscordButtonId.FIT_COACH_CONFIGURE_SET_MEAL_TIMES)
            .setLabel('Set Meal Times')
            .setStyle(ButtonStyle.Primary),
        ),
      );
    }

    return { embeds: [embed], components };
  }

  mealTimesUpdated(ranges: MealTimeRanges, timezone: string): EmbedBuilder[] {
    const rangeLines = Object.values(MealType).map((type) => {
      const r = ranges[type];
      return `- ${MealTypeDecorator.decorate(type)}: \`${r.start}–${r.end}\``;
    });

    const currentTime = new Date().toLocaleTimeString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    });

    const description = [
      `Meal time ranges configured for \`${timezone}\` (now: \`${currentTime}\`):`,
      '',
      ...rangeLines,
      '',
      'You can update these anytime with `/fit-coach settings configure`.',
    ].join('\n');

    return this.simple({
      description,
      variant: 'success',
      title: 'Meal Times Set',
    });
  }

  formatDefaultRanges(): string {
    return Object.values(MealType)
      .map((type) => {
        const range = DEFAULT_MEAL_TIME_RANGES[type];
        return `- ${MealTypeDecorator.decorate(type)}: \`${range.start}–${range.end}\``;
      })
      .join('\n');
  }
}
