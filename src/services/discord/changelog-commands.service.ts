import {
  CHANGELOG_TYPE_LABELS,
} from '@Constants/discord/changelog-commands.constant';
import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import { readFileSync } from 'fs';
import { join } from 'path';

type ChangeEntry = {
  type: string;
  description: string;
};

type VersionEntry = {
  version: string;
  date: string;
  changes: ChangeEntry[];
};

const MAX_VERSIONS = 5;

@Injectable()
export class ChangelogCommandsService {
  private readonly logger = new Logger(ChangelogCommandsService.name);

  buildChangelogEmbeds(): EmbedBuilder[] {
    let entries: VersionEntry[] = [];

    try {
      const raw = readFileSync(join(process.cwd(), 'changelog.json'), 'utf-8');
      entries = JSON.parse(raw) as VersionEntry[];
    } catch (err) {
      this.logger.error('Failed to read changelog.json', err);
      return [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('Changelog unavailable')
          .setDescription('Could not load changelog.json.'),
      ];
    }

    const shown = entries.slice(0, MAX_VERSIONS);
    const embeds: EmbedBuilder[] = [];

    for (const entry of shown) {
      const lines = entry.changes.map((c) => {
        const label = CHANGELOG_TYPE_LABELS[c.type] ?? c.type;
        return `**${label}** — ${c.description}`;
      });

      embeds.push(
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`v${entry.version}`)
          .setDescription(lines.join('\n'))
          .setFooter({ text: entry.date }),
      );
    }

    if (entries.length > MAX_VERSIONS) {
      embeds[embeds.length - 1].setFooter({
        text: `${shown[shown.length - 1].date} · ${entries.length - MAX_VERSIONS} older version(s) not shown`,
      });
    }

    return embeds;
  }
}
