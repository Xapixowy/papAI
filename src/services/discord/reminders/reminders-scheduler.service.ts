import { CronjobName } from '@Enums/cronjob-name.enum';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmbedBuilderService } from '@Services/discord/embed-builder.service';
import { RemindersService } from '@Services/reminders.service';
import { Client, DMChannel, TextChannel, userMention } from 'discord.js';

@Injectable()
export class RemindersSchedulerService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly client: Client,
    private readonly remindersService: RemindersService,
    private readonly embedBuilderService: EmbedBuilderService,
  ) {}

  @Cron('* * * * *', { name: CronjobName.REMINDERS_DISPATCH })
  async dispatchDueReminders(): Promise<void> {
    const due = await this.remindersService.findDueBefore(new Date());
    if (!due.length) return;

    for (const reminder of due) {
      try {
        const channel = await this.client.channels.fetch(
          reminder.sourceChannelId,
        );

        if (
          !(channel instanceof TextChannel) &&
          !(channel instanceof DMChannel)
        ) {
          throw new Error(
            `Channel ${reminder.sourceChannelId} is not a sendable text/DM channel`,
          );
        }

        const embeds = this.embedBuilderService.simple({
          title: 'Reminder',
          description: reminder.content,
          variant: 'info',
        });

        await channel.send({
          content: reminder.discordGuildId
            ? userMention(reminder.discordUserId)
            : undefined,
          embeds,
        });
        await this.remindersService.markSent(reminder.id);
      } catch (error) {
        this.logger.error(
          `Failed to deliver reminder ${reminder.id}: ${error}`,
        );
        await this.remindersService.markFailed(reminder.id);
      }
    }
  }
}
