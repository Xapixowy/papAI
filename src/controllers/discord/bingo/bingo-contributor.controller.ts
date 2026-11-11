import { Injectable } from '@nestjs/common';
import { Context, Options, Subcommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import { BingoMemberOptions } from '@Options/bingo.options';
import { BingoSelectionService } from '@Services/bingo/bingo-selection.service';
import { BingoCommand } from './bingo-command';
import { BingoRepliesService } from './bingo-replies.service';

@Injectable()
@BingoCommand({
  name: 'contributor',
  description: 'Grant or revoke access to add phrases',
})
export class BingoContributorController {
  constructor(
    private readonly replies: BingoRepliesService,
    private readonly selections: BingoSelectionService,
  ) {}
  @Subcommand({
    name: 'add',
    description: 'Choose a set and invite a contributor',
  })
  async add(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoMemberOptions,
  ): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'contributor-add', { userId: o.user.id }),
    );
  }
  @Subcommand({
    name: 'remove',
    description: 'Choose a set and revoke contributor access',
  })
  async remove(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoMemberOptions,
  ): Promise<void> {
    await this.replies.run(i, (actor) =>
      this.selections.open(actor, 'contributor-remove', { userId: o.user.id }),
    );
  }
}
