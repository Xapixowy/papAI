import { Injectable } from '@nestjs/common';
import {
  Button,
  ComponentParam,
  Context,
  SelectedStrings,
  StringSelect,
} from 'necord';
import type { ButtonContext, StringSelectContext } from 'necord';
import { BingoSelectionService } from '@Services/bingo/bingo-selection.service';
import { BingoRepliesService } from './bingo-replies.service';

@Injectable()
export class BingoSelectionController {
  constructor(
    private readonly selections: BingoSelectionService,
    private readonly replies: BingoRepliesService,
  ) {}
  @StringSelect('bingo/pick/:token')
  async choose(
    @Context() [i]: StringSelectContext,
    @ComponentParam('token') token: string,
    @SelectedStrings() [value]: string[],
  ): Promise<void> {
    await this.replies.update(i, (actor) =>
      this.selections.choose(actor, token, value),
    );
  }
  @Button('bingo/pick-page/:token/:page')
  async page(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
    @ComponentParam('page') page: string,
  ): Promise<void> {
    await this.replies.update(i, (actor) =>
      this.selections.page(actor, token, page),
    );
  }
  @Button('bingo/pick-cancel/:token')
  async cancel(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
  ): Promise<void> {
    await this.replies.update(i, (actor) =>
      this.selections.cancel(actor, token),
    );
  }
}
