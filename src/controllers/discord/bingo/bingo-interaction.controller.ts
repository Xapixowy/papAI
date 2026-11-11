import { Injectable } from '@nestjs/common';
import {
  Button,
  ComponentParam,
  Context,
  SelectedStrings,
  StringSelect,
} from 'necord';
import type { ButtonContext, StringSelectContext } from 'necord';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoDiscordService } from '@Services/bingo/bingo-discord.service';
import { cellLabel, requireBingo } from '@Services/bingo/bingo-rules';
import { BingoRepliesService } from './bingo-replies.service';

@Injectable()
export class BingoInteractionController {
  constructor(
    private readonly store: BingoStoreService,
    private readonly discord: BingoDiscordService,
    private readonly replies: BingoRepliesService,
  ) {}

  @Button('bingo/mark-menu/:game')
  async markMenu(
    @Context() [i]: ButtonContext,
    @ComponentParam('game') gameId: string,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const { game } = await this.store.board(actor, gameId, i.message.id);
      return {
        content: 'Choose a cell to mark.',
        components: [this.discord.markMenu(game, actor.userId)],
        allowedMentions: { parse: [] },
      };
    });
  }

  @StringSelect('bingo/mark-pick/:game/:user/:message')
  async markPick(
    @Context() [i]: StringSelectContext,
    @ComponentParam('game') gameId: string,
    @ComponentParam('user') userId: string,
    @ComponentParam('message') messageId: string,
    @SelectedStrings() [value]: string[],
  ): Promise<void> {
    await this.replies.update(i, async (actor) => {
      requireBingo(
        actor.userId === userId,
        'This selection belongs to another user.',
      );
      const game = await this.store.mark(
        actor,
        gameId,
        messageId,
        this.index(value),
      );
      await this.discord.publish(game.id);
      return this.replies.text(
        `${cellLabel(this.index(value), game.size)} is marked.`,
      );
    });
  }

  // Keep interactions on previously posted boards working until they are refreshed.
  @StringSelect('bingo/mark/:game')
  async mark(
    @Context() [i]: StringSelectContext,
    @ComponentParam('game') gameId: string,
    @SelectedStrings() [value]: string[],
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const game = await this.store.mark(
        actor,
        gameId,
        i.message.id,
        this.index(value),
      );
      await this.discord.publish(game.id);
      return `${cellLabel(this.index(value), game.size)} is marked.`;
    });
  }

  @Button('bingo/unmark/:game')
  async unmark(
    @Context() [i]: ButtonContext,
    @ComponentParam('game') gameId: string,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const { game, eligible } = await this.store.board(
        actor,
        gameId,
        i.message.id,
      );
      return {
        content: 'Choose a cell to unmark.',
        components: [this.discord.undoMenu(game, eligible, actor.userId)],
        allowedMentions: { parse: [] },
      };
    });
  }

  @StringSelect('bingo/undo/:game/:user/:message')
  async undo(
    @Context() [i]: StringSelectContext,
    @ComponentParam('game') gameId: string,
    @ComponentParam('user') userId: string,
    @ComponentParam('message') messageId: string,
    @SelectedStrings() [value]: string[],
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      requireBingo(
        actor.userId === userId,
        'This selection belongs to another user.',
      );
      const game = await this.store.mark(
        actor,
        gameId,
        messageId,
        this.index(value),
        true,
      );
      await this.discord.publish(game.id);
      return `${cellLabel(this.index(value), game.size)} is no longer marked.`;
    });
  }

  private index(value: string): number {
    requireBingo(
      /^(?:[0-9]|1[0-9]|2[0-4])$/.test(value),
      'Choose a valid cell from this board.',
    );
    return Number(value);
  }
}
