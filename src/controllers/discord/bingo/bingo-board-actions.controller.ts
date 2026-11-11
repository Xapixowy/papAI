import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  Button,
  ComponentParam,
  Context,
  Modal,
  ModalParam,
  SelectedStrings,
  StringSelect,
} from 'necord';
import type { ButtonContext, ModalContext, StringSelectContext } from 'necord';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoDiscordService } from '@Services/bingo/bingo-discord.service';
import { BingoSelectionService } from '@Services/bingo/bingo-selection.service';
import { requireBingo } from '@Services/bingo/bingo-rules';
import { BingoRepliesService } from './bingo-replies.service';

@Injectable()
export class BingoBoardActionsController {
  constructor(
    private readonly store: BingoStoreService,
    private readonly discord: BingoDiscordService,
    private readonly selections: BingoSelectionService,
    private readonly replies: BingoRepliesService,
  ) {}

  @Button('bingo/add-phrase/:game')
  async addPhrase(
    @Context() [i]: ButtonContext,
    @ComponentParam('game') gameId: string,
  ): Promise<void> {
    await this.replies.modal(
      i,
      new ModalBuilder()
        .setCustomId(`bingo/phrase-form/${gameId}/${i.message.id}`)
        .setTitle('Add phrase')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('text')
              .setLabel('Phrase for this bingo set')
              .setPlaceholder('Enter a phrase (up to 80 characters)')
              .setStyle(TextInputStyle.Short)
              .setMinLength(1)
              .setMaxLength(80)
              .setRequired(true),
          ),
        ),
    );
  }

  @Modal('bingo/phrase-form/:game/:message')
  async savePhrase(
    @Context() [i]: ModalContext,
    @ModalParam('game') gameId: string,
    @ModalParam('message') messageId: string,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const { game } = await this.store.board(actor, gameId, messageId, true);
      await this.store.phrase(
        actor,
        game.setId,
        'add',
        i.fields.getTextInputValue('text'),
      );
      return 'Phrase added to this set. Existing boards have not changed.';
    });
  }

  @Button('bingo/phrases/:game')
  async phrases(
    @Context() [i]: ButtonContext,
    @ComponentParam('game') gameId: string,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const { game } = await this.store.board(
        actor,
        gameId,
        i.message.id,
        true,
      );
      return this.selections.open(actor, 'show', {}, game.setId);
    });
  }

  // Legacy lifecycle controls remain routable on messages posted before 0.8.3.
  // New and refreshed boards expose only the four everyday actions.
  @Button('bingo/new-game/:game')
  async newGame(
    @Context() [i]: ButtonContext,
    @ComponentParam('game') gameId: string,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const { game } = await this.store.board(
        actor,
        gameId,
        i.message.id,
        true,
      );
      requireBingo(
        game.endedAt,
        'End the current game before starting a new one.',
      );
      return {
        ...this.replies.text('Choose a board size, then choose a bingo set.'),
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(
                `bingo/size/${game.id}/${actor.userId}/${game.messageId}`,
              )
              .setPlaceholder('Choose a board size')
              .addOptions(
                [3, 4, 5].map((size) => ({
                  label: `${size}×${size}`,
                  value: String(size),
                })),
              ),
          ),
        ],
      };
    });
  }

  @StringSelect('bingo/size/:game/:user/:message')
  async size(
    @Context() [i]: StringSelectContext,
    @ComponentParam('game') gameId: string,
    @ComponentParam('user') userId: string,
    @ComponentParam('message') messageId: string,
    @SelectedStrings() [value]: string[],
  ): Promise<void> {
    await this.replies.update(i, async (actor) => {
      requireBingo(
        actor.userId === userId,
        'This menu belongs to another user. Open your own from the board.',
      );
      requireBingo(/^[345]$/.test(value), 'Choose a valid board size.');
      await this.store.board(actor, gameId, messageId, true);
      return this.selections.open(actor, 'start', { size: Number(value) });
    });
  }

  @Button('bingo/end-game/:game')
  async endGame(
    @Context() [i]: ButtonContext,
    @ComponentParam('game') gameId: string,
  ): Promise<void> {
    await this.replies.run(i, async (actor) => {
      const { game, canManage } = await this.store.board(
        actor,
        gameId,
        i.message.id,
      );
      requireBingo(
        canManage,
        'Only the set owner or a user with Manage Channels can end this game.',
      );
      return {
        ...this.replies.text(
          'End this game? Its final board and marks will be kept.',
        ),
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(
                `bingo/end-confirm/${game.id}/${actor.userId}/${game.messageId}`,
              )
              .setLabel('End game')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`bingo/board-cancel/${actor.userId}`)
              .setLabel('Keep playing')
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
      };
    });
  }

  @Button('bingo/end-confirm/:game/:user/:message')
  async confirmEnd(
    @Context() [i]: ButtonContext,
    @ComponentParam('game') gameId: string,
    @ComponentParam('user') userId: string,
    @ComponentParam('message') messageId: string,
  ): Promise<void> {
    await this.replies.update(i, async (actor) => {
      requireBingo(
        actor.userId === userId,
        'This confirmation belongs to another user.',
      );
      await this.store.board(actor, gameId, messageId);
      const game = await this.store.end(actor, gameId);
      return this.replies.text(
        `Game ended.\n${await this.discord.publish(game.id)}`,
      );
    });
  }

  @Button('bingo/board-cancel/:user')
  async cancelEnd(
    @Context() [i]: ButtonContext,
    @ComponentParam('user') userId: string,
  ): Promise<void> {
    await this.replies.update(i, (actor) => {
      requireBingo(
        actor.userId === userId,
        'This confirmation belongs to another user.',
      );
      return Promise.resolve(this.replies.text('Game kept open.'));
    });
  }
}
