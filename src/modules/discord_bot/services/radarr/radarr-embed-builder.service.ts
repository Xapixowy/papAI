import { RADARR_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/radarr-commands.config';
import { DiskSpace } from '@Types/radarr';
import { QueueResponse } from '@Types/responses/radarr/queue-response.type';
import { TrackedDownloadStateDecorator } from '@Utils/decorators/tracked-download-state.decorator';
import { DateHelper } from '@Utils/helpers/date.helper';
import { Client, EmbedBuilder } from 'discord.js';
import { filesize } from 'filesize';
import { EmbedBuilderService } from '../embed-builder.service';

export class RadarrEmbedBuilderService extends EmbedBuilderService {
  constructor() {
    super();
  }

  static diskSpace({
    diskSpaceEntries,
    client,
  }: {
    diskSpaceEntries: DiskSpace[];
    client: Client;
  }): EmbedBuilder {
    const description = 'Free disk space information for Radarr server.';

    const longestPathLength = diskSpaceEntries.reduce((acc, diskSpaceEntry) => {
      const pathLength = diskSpaceEntry.path?.length ?? 0;
      return pathLength > acc ? pathLength : acc;
    }, 0);

    const diskSpaceSection = this.generateSection({
      title: '`💾` Disk space',
      description: diskSpaceEntries.map((diskSpaceEntry) => {
        const pathSpaces: string = ' '.repeat(
          longestPathLength - (diskSpaceEntry.path?.length ?? 0),
        );

        const free = diskSpaceEntry.freeSpace;
        const total = diskSpaceEntry.totalSpace;
        const percentage = (free / total) * 100;

        const icon = percentage >= 40 ? '✅' : percentage >= 15 ? '⚠️' : '❌';

        return (
          '- `' +
          `${icon} ${diskSpaceEntry.path}:${pathSpaces} ${filesize(free)} / ${filesize(total)}` +
          '`'
        );
      }),
    });

    return EmbedBuilderService.simple({
      description: `${description}\n${diskSpaceSection}`,
      variant: 'success',
      thumbnail: RADARR_COMMANDS_CONFIG.embed.thumbnail,
      title: RADARR_COMMANDS_CONFIG.embed.title,
      client,
    });
  }

  static currentDownloads({
    currentDownloads,
    client,
  }: {
    currentDownloads: QueueResponse;
    client: Client;
  }): EmbedBuilder {
    const description = 'Current downloads queue for Radarr server.';
    const currentDownloadsSectionDescription = !currentDownloads.records?.length
      ? ['There are no current downloads.']
      : currentDownloads.records.map((record) => {
          const title = record.title;
          const status = record.trackedDownloadState;
          const estimatedCompletionTime = record.estimatedCompletionTime;
          return (
            '- `' +
            `${TrackedDownloadStateDecorator.decorateIcon(status)} ${title}` +
            '`' +
            (estimatedCompletionTime
              ? ` **(${DateHelper.formatDistance(new Date(estimatedCompletionTime))})**`
              : '')
          );
        });

    const currentDownloadsSection = this.generateSection({
      title: '`📥` Current downloads',
      description: currentDownloadsSectionDescription,
    });

    return EmbedBuilderService.simple({
      description: `${description}\n${currentDownloadsSection}`,
      variant: 'success',
      thumbnail: RADARR_COMMANDS_CONFIG.embed.thumbnail,
      title: RADARR_COMMANDS_CONFIG.embed.title,
      client,
    });
  }

  static error({
    description,
    client,
  }: {
    description: string;
    client: Client;
  }): EmbedBuilder {
    return EmbedBuilderService.simple({
      description,
      variant: 'error',
      thumbnail: RADARR_COMMANDS_CONFIG.embed.thumbnail,
      title: RADARR_COMMANDS_CONFIG.embed.title,
      client,
    });
  }
}
