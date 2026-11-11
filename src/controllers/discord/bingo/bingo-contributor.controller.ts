import { Injectable, UseInterceptors } from '@nestjs/common';
import { Context, Options, Subcommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import { BingoMemberOptions } from '@Options/bingo.options';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoDiscordService } from '@Services/bingo/bingo-discord.service';
import { BingoCommand } from './bingo-command';
import { BingoRepliesService } from './bingo-replies.service';
import { BingoAutocompleteInterceptor } from './bingo-autocomplete.interceptor';

@Injectable()
@BingoCommand({
  name: 'contributor',
  description: 'Grant or revoke access to add phrases',
})
@UseInterceptors(BingoAutocompleteInterceptor)
export class BingoContributorController {
  constructor(
    private readonly store: BingoStoreService,
    private readonly discord: BingoDiscordService,
    private readonly replies: BingoRepliesService,
  ) {}

  @Subcommand({
    name: 'add',
    description: 'Invite a contributor to your bingo set',
  })
  async add(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoMemberOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      await this.discord.member(actor.guildId, o.user.id);
      await this.store.contributor(actor, o.set, o.user.id, true);
      return `Contributor access granted to <@${o.user.id}>.`;
    });
  }

  @Subcommand({
    name: 'remove',
    description: 'Revoke contributor access to your bingo set',
  })
  async remove(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoMemberOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      await this.store.contributor(actor, o.set, o.user.id, false);
      return `Contributor access revoked for <@${o.user.id}>.`;
    });
  }
}
