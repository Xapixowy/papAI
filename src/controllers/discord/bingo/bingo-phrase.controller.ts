import { Injectable } from '@nestjs/common';
import { Context, Options, Subcommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import {
  BingoAddPhraseOptions,
  BingoEditPhraseOptions,
} from '@Options/bingo.options';
import { BingoSelectionService } from '@Services/bingo/bingo-selection.service';
import { BingoCommand } from './bingo-command';
import { BingoRepliesService } from './bingo-replies.service';

@Injectable()
@BingoCommand({ name: 'phrase', description: 'Add and maintain bingo phrases' })
export class BingoPhraseController {
  constructor(
    private readonly replies: BingoRepliesService,
    private readonly selections: BingoSelectionService,
  ) {}
  @Subcommand({ name: 'add', description: 'Choose a set and add your phrase' })
  async add(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoAddPhraseOptions,
  ): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'phrase-add', { text: o.text }),
    );
  }
  @Subcommand({ name: 'edit', description: 'Choose a set and phrase to edit' })
  async edit(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoEditPhraseOptions,
  ): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'phrase-edit', { text: o.text }),
    );
  }
  @Subcommand({
    name: 'remove',
    description: 'Choose a set and phrase to remove',
  })
  async remove(@Context() [i]: SlashCommandContext): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'phrase-remove'),
    );
  }
}
