import { Injectable, UseInterceptors } from '@nestjs/common';
import { Context, Options, Subcommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import { BingoStartOptions } from '@Options/bingo.options';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoDiscordService } from '@Services/bingo/bingo-discord.service';
import { BingoCommand } from './bingo-command';
import { BingoRepliesService } from './bingo-replies.service';
import { BingoAutocompleteInterceptor } from './bingo-autocomplete.interceptor';

@Injectable()
@BingoCommand({
  name: 'game',
  description: 'Start and manage bingo on this channel',
})
@UseInterceptors(BingoAutocompleteInterceptor)
export class BingoGameController {
  constructor(
    private readonly store: BingoStoreService,
    private readonly discord: BingoDiscordService,
    private readonly replies: BingoRepliesService,
  ) {}

  @Subcommand({
    name: 'start',
    description: 'Draw a board and start a game on this channel',
  })
  async start(
    @Context() [i]: SlashCommandContext,
    @Options() o: BingoStartOptions,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const game = await this.store.start(actor, o.set, o.size);
      return `Game started.\n${await this.discord.publish(game.id)}`;
    });
  }

  @Subcommand({
    name: 'end',
    description: 'End the active game and keep its final board',
  })
  async end(@Context() [i]: SlashCommandContext): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const game = await this.store.end(actor);
      return `Game ended.\n${await this.discord.publish(game.id)}`;
    });
  }

  @Subcommand({
    name: 'show',
    description: 'Show the active board or restore its deleted message',
  })
  async show(@Context() [i]: SlashCommandContext): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const { game, canManage } = await this.store.active(actor);
      return await this.discord.publish(game.id, canManage);
    });
  }
}
