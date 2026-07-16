import { REMINDER_COMMANDS_CONFIG } from '@Constants/discord/reminders-commands.constant';
import { ReminderCommandDecorator } from '@Controllers/discord/reminders-commands.controller';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { RequiresDiscordGuildFeature } from '@Decorators/nest/requires-discord-guild-feature.decorator';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { ReminderCancelOptions } from '@Options/reminders/reminder-cancel.options';
import { ReminderCreateOptions } from '@Options/reminders/reminder-create.options';
import { RemindersCommandsService } from '@Services/discord/reminders-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';

@Injectable()
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.REMINDERS)
@ReminderCommandDecorator()
export class RemindersCommandsController extends BaseCommandsController {
  constructor(
    private readonly remindersCommandsService: RemindersCommandsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand(REMINDER_COMMANDS_CONFIG.commands.create)
  async onCreate(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: ReminderCreateOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embeds = await this.remindersCommandsService.createFromSlashCommand({
      content: options.content,
      time: options.time,
      date: options.date,
      discordUserId: interaction.user.id,
      discordGuildId: interaction.guildId,
      sourceChannelId: interaction.channelId,
    });

    await interaction.editReply({ embeds });
  }

  @Subcommand(REMINDER_COMMANDS_CONFIG.commands.list)
  async onList(@Context() [interaction]: SlashCommandContext): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embeds = await this.remindersCommandsService.list({
      discordUserId: interaction.user.id,
    });

    await interaction.editReply({ embeds });
  }

  @Subcommand(REMINDER_COMMANDS_CONFIG.commands.cancel)
  async onCancel(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: ReminderCancelOptions,
  ): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embeds = await this.remindersCommandsService.cancel({
      discordUserId: interaction.user.id,
      idPrefix: options.id,
    });

    await interaction.editReply({ embeds });
  }
}
