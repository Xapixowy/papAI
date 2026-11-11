import { Injectable, UseInterceptors } from '@nestjs/common';
import { Context, Options, Subcommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import {
  BingoAddPhraseOptions,
  BingoEditPhraseOptions,
  BingoPhraseOptions,
} from '@Options/bingo.options';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoCommand } from './bingo-command';
import { BingoRepliesService } from './bingo-replies.service';
import { BingoAutocompleteInterceptor } from './bingo-autocomplete.interceptor';

@Injectable()
@BingoCommand({ name: 'phrase', description: 'Add and maintain bingo phrases' })
@UseInterceptors(BingoAutocompleteInterceptor)
export class BingoPhraseController {
  constructor(
    private readonly store: BingoStoreService,
    private readonly replies: BingoRepliesService,
  ) {}

  @Subcommand({ name: 'add', description: 'Add a phrase to a bingo set' })
  async add(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoAddPhraseOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const phrase = await this.store.phrase(actor, o.set, 'add', o.text);
      return `Phrase added.\nPhrase ID: \`${phrase!.id}\``;
    });
  }

  @Subcommand({ name: 'edit', description: 'Edit a phrase you own or manage' })
  async edit(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoEditPhraseOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      await this.store.phrase(actor, o.set, 'edit', o.text, o.phrase);
      return 'Phrase updated. Existing boards have not changed.';
    });
  }

  @Subcommand({
    name: 'remove',
    description: 'Remove a phrase you own or manage',
  })
  async remove(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoPhraseOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      await this.store.phrase(actor, o.set, 'remove', undefined, o.phrase);
      return 'Phrase removed. Existing boards have not changed.';
    });
  }
}
