import { Injectable } from '@nestjs/common';
import {
  Button,
  ComponentParam,
  Context,
  createCommandGroupDecorator,
  Modal,
  ModalParam,
  Options,
  SelectedStrings,
  StringSelect,
  Subcommand,
} from 'necord';
import type {
  ButtonContext,
  ModalContext,
  SlashCommandContext,
  StringSelectContext,
} from 'necord';
import { QuoteAuthorOptions } from '@Options/quote.options';
import { QuoteStoreService } from '@Services/quotes/quote-store.service';
import { QuoteDiscordService } from '@Services/quotes/quote-discord.service';
import { QuoteUiService, quoteForm } from '@Services/quotes/quote-ui.service';
import { quoteEmbed } from '@Services/quotes/quote-renderer';
import { requireQuote } from '@Services/quotes/quote-rules';

const QuoteCommand = createCommandGroupDecorator({
  name: 'quote',
  description: 'Save, browse, and share server quotes',
});

@Injectable()
@QuoteCommand()
export class QuoteCommandsController {
  constructor(
    private readonly store: QuoteStoreService,
    private readonly ui: QuoteUiService,
    private readonly discord: QuoteDiscordService,
  ) {}

  @Subcommand({
    name: 'add',
    description: 'Add a quote with its author and content',
  })
  async add(@Context() [i]: SlashCommandContext): Promise<void> {
    try {
      requireQuote(
        i.guildId && i.channelId,
        'Use quotes in a Discord server channel.',
      );
      await i.showModal(quoteForm('quote/add'));
    } catch (error) {
      await this.discord.failure(i, error);
    }
  }

  @Modal('quote/add')
  async saveAdd(@Context() [i]: ModalContext): Promise<void> {
    await this.discord.run(i, async (actor) => {
      await this.store.add(
        actor,
        i.fields.getTextInputValue('author'),
        i.fields.getTextInputValue('content'),
      );
      return this.ui.reply('Quote added.', 'success');
    });
  }

  @Subcommand({
    name: 'show',
    description: 'Browse server quotes, optionally filtered by author',
  })
  async show(
    @Context() [i]: SlashCommandContext,
    @Options() options: QuoteAuthorOptions,
  ): Promise<void> {
    await this.discord.run(
      i,
      (actor) => this.ui.open(actor, 'show', options.author),
      'public',
    );
  }

  @Subcommand({ name: 'edit', description: 'Choose a quote to edit privately' })
  async edit(@Context() [i]: SlashCommandContext): Promise<void> {
    await this.discord.run(i, (actor) => this.ui.open(actor, 'edit'));
  }

  @Subcommand({
    name: 'remove',
    description: 'Choose a quote and confirm its removal privately',
  })
  async remove(@Context() [i]: SlashCommandContext): Promise<void> {
    await this.discord.run(i, (actor) => this.ui.open(actor, 'remove'));
  }

  @Subcommand({
    name: 'random',
    description: 'Share a random quote, optionally filtered by author',
  })
  async random(
    @Context() [i]: SlashCommandContext,
    @Options() options: QuoteAuthorOptions,
  ): Promise<void> {
    await this.discord.run(
      i,
      async (actor) => {
        await this.store.random(actor, options.author, async (quote) => {
          await i.editReply(
            quote
              ? {
                  embeds: [quoteEmbed(quote)],
                  allowedMentions: { parse: [] },
                }
              : this.ui.reply(
                  options.author != null
                    ? 'No quotes found for this author.'
                    : 'No quotes saved yet.',
                ),
          );
        });
      },
      'public',
    );
  }

  @Button('quote/browse/:token/:direction')
  async browse(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
    @ComponentParam('direction') direction: string,
  ): Promise<void> {
    await this.discord.run(
      i,
      (actor) => this.ui.navigate(actor, token, direction),
      'update',
    );
  }

  @Button('quote/page/:token/:direction')
  async page(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
    @ComponentParam('direction') direction: string,
  ): Promise<void> {
    await this.discord.run(
      i,
      (actor) => this.ui.page(actor, token, direction),
      'update',
    );
  }

  @StringSelect('quote/edit/:token')
  async selectEdit(
    @Context() [i]: StringSelectContext,
    @ComponentParam('token') token: string,
    @SelectedStrings() [id]: string[],
  ): Promise<void> {
    try {
      await i.showModal(
        await this.ui.editForm(await this.discord.actor(i), token, id),
      );
    } catch (error) {
      await this.discord.failure(i, error);
    }
  }

  @Modal('quote/save/:token')
  async saveEdit(
    @Context() [i]: ModalContext,
    @ModalParam('token') token: string,
  ): Promise<void> {
    await this.discord.run(
      i,
      (actor) =>
        this.ui.saveEdit(
          actor,
          token,
          i.fields.getTextInputValue('author'),
          i.fields.getTextInputValue('content'),
        ),
      i.isFromMessage() ? 'update' : 'private',
    );
  }

  @StringSelect('quote/remove/:token')
  async selectRemove(
    @Context() [i]: StringSelectContext,
    @ComponentParam('token') token: string,
    @SelectedStrings() [id]: string[],
  ): Promise<void> {
    await this.discord.run(
      i,
      (actor) => this.ui.removal(actor, token, id),
      'update',
    );
  }

  @Button('quote/confirm/:token')
  async confirm(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
  ): Promise<void> {
    await this.discord.run(
      i,
      (actor) => this.ui.confirm(actor, token),
      'update',
    );
  }

  @Button('quote/cancel/:token')
  async cancel(
    @Context() [i]: ButtonContext,
    @ComponentParam('token') token: string,
  ): Promise<void> {
    await this.discord.run(
      i,
      (actor) => this.ui.cancel(actor, token),
      'update',
    );
  }
}
