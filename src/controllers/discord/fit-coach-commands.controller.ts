import { FIT_COACH_COMMANDS_CONFIG } from '@Constants/discord/fit-coach-commands.constant';
import { REMINDER_KEYWORDS } from '@Constants/discord/reminders-commands.constant';
import { DiscordButtonId } from '@Enums/discord/discord-button-id.enum';
import { DiscordModalId } from '@Enums/discord/discord-modal-id.enum';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { Injectable } from '@nestjs/common';
import { FitCoachCommandsService } from '@Services/discord/fit-coach-commands.service';
import {
  ButtonInteraction,
  DMChannel,
  GatewayIntentBits,
  InteractionContextType,
  Message,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import {
  Button,
  type ButtonContext,
  Context,
  createCommandGroupDecorator,
  Modal,
  type ModalContext,
  On,
  SelectedStrings,
  StringSelect,
  type StringSelectContext,
} from 'necord';
import { BaseCommandsController } from './base-commands.controller';

export const FitCoachCommandDecorator = createCommandGroupDecorator({
  name: FIT_COACH_COMMANDS_CONFIG.name,
  description: FIT_COACH_COMMANDS_CONFIG.description,
  contexts: [InteractionContextType.BotDM],
});

@Injectable()
export class FitCoachCommandsController extends BaseCommandsController {
  constructor(
    private readonly fitCoachCommandsService: FitCoachCommandsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent];
  }

  @On('messageCreate')
  async onDmMessage(@Context() [message]: [Message]): Promise<void> {
    if (message.author.bot) return;
    if (!(message.channel instanceof DMChannel)) return;

    // Reminder requests are handled exclusively by RemindersMessageCommandsController.
    const lowerContent = message.content.toLowerCase();
    if (REMINDER_KEYWORDS.some((keyword) => lowerContent.includes(keyword))) {
      return;
    }

    const attachments = message.attachments.map((a) => a);

    await this.fitCoachCommandsService.handleDmMessage({
      userId: message.author.id,
      content: message.content,
      attachments,
      channel: message.channel,
    });
  }

  @Button(DiscordButtonId.FIT_COACH_ONBOARDING_USE_DEFAULTS)
  async onOnboardingUseDefaults(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleOnboardingUseDefaults(
      interaction as ButtonInteraction,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_ONBOARDING_CUSTOMIZE)
  async onOnboardingCustomize(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleOnboardingCustomize(
      interaction as ButtonInteraction,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_CONFIGURE_SET_TIMEZONE)
  async onConfigureSetTimezone(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleOpenTimezoneModal(
      interaction as ButtonInteraction,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_CONFIGURE_OPEN_TZ_FORM)
  async onConfigureOpenTzForm(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleOpenTzForm(
      interaction as ButtonInteraction,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_CONFIGURE_SET_MEAL_TIMES)
  async onConfigureSetMealTimes(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleOpenMealTimesModal(
      interaction as ButtonInteraction,
    );
  }

  @Modal(DiscordModalId.FIT_COACH_TIMEZONE)
  async onTimezoneModalSubmit(
    @Context() [interaction]: ModalContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleTimezoneModalSubmit(
      interaction as ModalSubmitInteraction,
    );
  }

  @Modal(DiscordModalId.FIT_COACH_MEAL_TIMES)
  async onMealTimesModalSubmit(
    @Context() [interaction]: ModalContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleMealTimesModalSubmit(
      interaction as ModalSubmitInteraction,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_MEAL_CONFIRM)
  async onMealConfirm(@Context() [interaction]: ButtonContext): Promise<void> {
    await this.fitCoachCommandsService.handleMealConfirm(
      interaction as ButtonInteraction,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_MEAL_REJECT)
  async onMealReject(@Context() [interaction]: ButtonContext): Promise<void> {
    await this.fitCoachCommandsService.handleMealReject(
      interaction as ButtonInteraction,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_MEAL_REMOVE_SHOW_SELECT)
  async onMealRemoveShowSelect(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleMealRemoveShowSelect(
      interaction as ButtonInteraction,
    );
  }

  @StringSelect(DiscordSelectId.FIT_COACH_MEAL_REMOVE)
  async onMealRemoveSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [mealId]: string[],
  ): Promise<void> {
    await this.fitCoachCommandsService.handleMealRemoveSelect(
      interaction as StringSelectMenuInteraction,
      mealId,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_MEAL_REMOVE_CONFIRM)
  async onMealRemoveConfirm(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleMealRemoveConfirm(
      interaction as ButtonInteraction,
    );
  }

  @Button(DiscordButtonId.FIT_COACH_MEAL_REMOVE_CANCEL)
  async onMealRemoveCancel(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    await this.fitCoachCommandsService.handleMealRemoveCancel(
      interaction as ButtonInteraction,
    );
  }
}
