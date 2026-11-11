import { Injectable } from '@nestjs/common';
import { Context, Options, Subcommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import { escapeMarkdown } from 'discord.js';
import {
  BingoCreateOptions,
  BingoListOptions,
  BingoMemberOptions,
} from '@Options/bingo.options';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoSelectionService } from '@Services/bingo/bingo-selection.service';
import { BingoCommand } from './bingo-command';
import { BingoRepliesService } from './bingo-replies.service';

@Injectable()
@BingoCommand({
  name: 'set',
  description: 'Manage bingo sets and browse phrases',
})
export class BingoSetController {
  constructor(
    private readonly store: BingoStoreService,
    private readonly replies: BingoRepliesService,
    private readonly selections: BingoSelectionService,
  ) {}
  @Subcommand({ name: 'create', description: 'Create your own bingo set' })
  async create(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoCreateOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const set = await this.store.create(actor, o.name);
      return `Created **${escapeMarkdown(set.name)}**.\nAdd phrases with /bingo phrase add.`;
    });
  }
  @Subcommand({ name: 'list', description: 'Select a bingo set to browse' })
  async list(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoListOptions,
  ): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'show', {
        includeArchived: o.includeArchived ?? false,
      }),
    );
  }
  @Subcommand({
    name: 'show',
    description: 'Choose a set and browse its phrases',
  })
  async show(@Context() [i]: SlashCommandContext): Promise<void> {
    await this.replies.run(i, (actor) => this.selections.open(actor, 'show'));
  }
  @Subcommand({
    name: 'archive',
    description: 'Choose a set to archive without ending its games',
  })
  async archive(@Context() [i]: SlashCommandContext): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'archive'),
    );
  }
  @Subcommand({
    name: 'restore',
    description: 'Choose an archived set to restore',
  })
  async restore(@Context() [i]: SlashCommandContext): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'restore'),
    );
  }
  @Subcommand({
    name: 'transfer',
    description: 'Choose a set to transfer or recover ownership',
  })
  async transfer(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoMemberOptions,
  ): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'transfer', { userId: o.user.id }),
    );
  }
}
