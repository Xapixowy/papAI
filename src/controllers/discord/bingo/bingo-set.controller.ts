import { Injectable, UseInterceptors } from '@nestjs/common';
import { Context, Options, Subcommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import { escapeMarkdown } from 'discord.js';
import {
  BingoCreateOptions,
  BingoListOptions,
  BingoMemberOptions,
  BingoSetOptions,
  BingoShowOptions,
} from '@Options/bingo.options';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoDiscordService } from '@Services/bingo/bingo-discord.service';
import { BingoCommand } from './bingo-command';
import { BingoRepliesService } from './bingo-replies.service';
import { BingoAutocompleteInterceptor } from './bingo-autocomplete.interceptor';

@Injectable()
@BingoCommand({
  name: 'set',
  description: 'Manage bingo sets and browse phrases',
})
@UseInterceptors(BingoAutocompleteInterceptor)
export class BingoSetController {
  constructor(
    private readonly store: BingoStoreService,
    private readonly discord: BingoDiscordService,
    private readonly replies: BingoRepliesService,
  ) {}

  @Subcommand({ name: 'create', description: 'Create your own bingo set' })
  async create(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoCreateOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const set = await this.store.create(actor, o.name);
      return `Created **${escapeMarkdown(set.name)}**.\nSet ID: \`${set.id}\`\nAdd phrases with /bingo phrase add.`;
    });
  }

  @Subcommand({ name: 'list', description: 'Browse bingo sets on this server' })
  async list(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoListOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const [sets, total] = await this.store.list(
        actor,
        o.page ?? 1,
        o.includeArchived,
      );
      return (
        `Page ${o.page ?? 1}/${Math.max(1, Math.ceil(total / 10))} · ${total} set(s)\n\n` +
        (sets
          .map(
            (s) =>
              `**${escapeMarkdown(s.name)}**${s.archived ? ' · Archived' : ''}\nID: \`${s.id}\``,
          )
          .join('\n\n') || 'No sets on this page.')
      );
    });
  }

  @Subcommand({ name: 'show', description: 'Show a set and its phrase IDs' })
  async show(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoShowOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const { set, phrases, total, contributors } = await this.store.show(
        actor,
        o.set,
        o.page,
      );
      return (
        `**${escapeMarkdown(set.name)}**${set.archived ? ' · Archived' : ''}\nSet ID: \`${set.id}\`\nOwner: <@${set.ownerId}> · Contributors: ${contributors}\nPage ${o.page ?? 1}/${Math.max(1, Math.ceil(total / 10))} · ${total} phrase(s)\n\n` +
        (phrases
          .map(
            (p) =>
              `${escapeMarkdown(p.text)}\nID: \`${p.id}\` · Author: <@${p.authorId}>`,
          )
          .join('\n\n') || 'No phrases on this page.')
      );
    });
  }

  @Subcommand({
    name: 'archive',
    description: 'Archive a set without ending its games',
  })
  async archive(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoSetOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      await this.store.archive(actor, o.set, true);
      return 'Set archived. Existing games can continue.';
    });
  }

  @Subcommand({ name: 'restore', description: 'Restore an archived set' })
  async restore(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoSetOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      await this.store.archive(actor, o.set, false);
      return 'Set restored.';
    });
  }

  @Subcommand({
    name: 'transfer',
    description: 'Transfer set ownership or recover it as an administrator',
  })
  async transfer(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoMemberOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      await this.discord.member(actor.guildId, o.user.id);
      await this.store.transfer(actor, o.set, o.user.id);
      return `Set ownership transferred to <@${o.user.id}>.`;
    });
  }
}
