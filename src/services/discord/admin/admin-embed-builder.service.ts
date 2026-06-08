import { ADMIN_COMMANDS_CONFIG } from '@Constants/discord/admin-commands.constant';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class AdminEmbedBuilderService extends EmbedBuilderService {
  constructor(
    protected readonly client: Client,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  cronList(
    jobs: { name: string; nextRun: string; lastRun: string | null }[],
  ): EmbedBuilder {
    const items = jobs.map(
      (j) =>
        `- \`${j.name}\`\n  - Next run: \`${j.nextRun}\`\n  - Last run: \`${j.lastRun ?? 'never'}\``,
    );

    const section = this.generateSection({
      title: '`⏰` Cron Jobs',
      description: items.length ? items : ['No cron jobs registered.'],
    });

    return this.simple({
      title: ADMIN_COMMANDS_CONFIG.embed.title,
      thumbnail: ADMIN_COMMANDS_CONFIG.embed.thumbnail,
      variant: 'info',
      description: section,
    });
  }
}
