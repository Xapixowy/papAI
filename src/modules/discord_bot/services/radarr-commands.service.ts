import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { RadarrHttpClientService } from '@Services/http/radarr-http-client.service';
import { Client, EmbedBuilder } from 'discord.js';
import { RadarrEmbedBuilderService } from './radarr/radarr-embed-builder.service';

@Injectable()
export class RadarrCommandsService {
  private errorCodeMessageMap: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.RADARR_DISK_SPACE_NOT_FOUND]:
      'There was an error getting the disk space.',
    [ErrorCode.RADARR_CURRENT_DOWNLOADS_NOT_FOUND]:
      'There was an error getting the current downloads.',
  };

  constructor(
    private readonly client: Client,
    private readonly radarrHttpClientService: RadarrHttpClientService,
  ) {}

  async diskSpaceHandler(): Promise<EmbedBuilder> {
    const diskSpaceEntries = await this.radarrHttpClientService.getDiskSpace();

    if (diskSpaceEntries.isErr()) {
      return RadarrEmbedBuilderService.error({
        description: this.errorCodeMessageMap[diskSpaceEntries.error]!,
        client: this.client,
      });
    }

    const diskSpaceEntriesValue = diskSpaceEntries.value;

    if (diskSpaceEntriesValue === null || diskSpaceEntriesValue.length === 0) {
      return RadarrEmbedBuilderService.error({
        description: 'There is no disk space available.',
        client: this.client,
      });
    }

    return RadarrEmbedBuilderService.diskSpace({
      diskSpaceEntries: diskSpaceEntriesValue,
      client: this.client,
    });
  }

  async currentDownloadsHandler(): Promise<EmbedBuilder> {
    const currentDownloads =
      await this.radarrHttpClientService.getCurrentDownloads();

    if (currentDownloads.isErr()) {
      return RadarrEmbedBuilderService.error({
        description: this.errorCodeMessageMap[currentDownloads.error]!,
        client: this.client,
      });
    }

    const currentDownloadsValue = currentDownloads.value;

    return RadarrEmbedBuilderService.currentDownloads({
      currentDownloads: currentDownloadsValue,
      client: this.client,
    });
  }
}
