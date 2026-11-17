import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { z } from 'zod';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { InteractionEditReplyOptions } from 'discord.js';
import type { Quote } from '@Database/entities/quote.entity';
import { ProviderToken } from '@Enums/provider-token.enum';
import { QuoteStoreService } from './quote-store.service';
import type { QuoteActor } from './quote-store.service';
import { requireQuote } from './quote-rules';
import { EmbedBuilderService } from '@Services/discord/embed-builder.service';
import type { EmbedVariant } from '@Types/discord/embed-variant.type';
import {
  quoteEmbed,
  quoteListEmbed,
  quotePages,
  quoteReply,
} from './quote-renderer';

const sessionSchema = z.object({
  guildId: z.string(),
  channelId: z.string(),
  userId: z.string(),
  action: z.enum(['show', 'edit', 'remove']),
  stage: z.enum(['browse', 'select', 'edit', 'confirm']),
  page: z.number().int().positive(),
  author: z.string().max(100).optional(),
  offered: z.array(z.string().uuid()),
  quoteId: z.string().uuid().optional(),
  revision: z.number().int().positive().optional(),
});
type Session = z.infer<typeof sessionSchema>;
const TTL = 600;

export function quoteForm(customId: string, quote?: Quote): ModalBuilder {
  const author = new TextInputBuilder()
    .setCustomId('author')
    .setLabel('Author')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(100)
    .setRequired(true);
  const content = new TextInputBuilder()
    .setCustomId('content')
    .setLabel('Quote')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(2000)
    .setRequired(true);
  if (quote) {
    author.setValue(quote.author);
    content.setValue(quote.content);
  }
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(quote ? 'Edit quote' : 'Add quote')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(author),
      new ActionRowBuilder<TextInputBuilder>().addComponents(content),
    );
}

@Injectable()
export class QuoteUiService {
  constructor(
    private readonly store: QuoteStoreService,
    @Inject(ProviderToken.REDIS) private readonly redis: Redis,
    private readonly embeds: EmbedBuilderService,
  ) {}

  reply(description: string, variant: EmbedVariant = 'info', title?: string) {
    return quoteReply(this.embeds, description, variant, title);
  }

  async open(
    actor: QuoteActor,
    action: Session['action'],
    author?: string | null,
  ): Promise<InteractionEditReplyOptions> {
    const token = randomUUID();
    const session: Session = {
      guildId: actor.guildId,
      channelId: actor.channelId,
      userId: actor.userId,
      action,
      stage: action === 'show' ? 'browse' : 'select',
      page: 1,
      offered: [],
      author: author ?? undefined,
    };
    return action === 'show'
      ? this.renderBrowse(actor, token, session)
      : this.renderSelection(actor, token, session);
  }

  async navigate(
    actor: QuoteActor,
    token: string,
    direction: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, async (session) => {
      requireQuote(
        session.action === 'show' && session.stage === 'browse',
        'Open your own quote browser with /quote show.',
      );
      requireQuote(
        direction === 'previous' || direction === 'next',
        'Choose a valid navigation button.',
      );
      session.page = Math.max(
        1,
        session.page + (direction === 'next' ? 1 : -1),
      );
      return this.renderBrowse(actor, token, session);
    });
  }

  async page(
    actor: QuoteActor,
    token: string,
    direction: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, (session) => {
      requireQuote(
        session.stage === 'select' && session.action !== 'show',
        'Run the command again to choose another quote.',
      );
      requireQuote(
        direction === 'previous' || direction === 'next',
        'Choose a valid navigation button.',
      );
      session.page = Math.max(
        1,
        session.page + (direction === 'next' ? 1 : -1),
      );
      return this.renderSelection(actor, token, session);
    });
  }

  async editForm(
    actor: QuoteActor,
    token: string,
    id: string,
  ): Promise<ModalBuilder> {
    return this.locked(actor, token, async (session) => {
      this.selected(session, 'edit', id);
      const quote = await this.store.managed(actor, id);
      session.stage = 'edit';
      session.quoteId = quote.id;
      session.revision = quote.revision;
      await this.save(token, session);
      return quoteForm(`quote/save/${token}`, quote);
    });
  }

  async saveEdit(
    actor: QuoteActor,
    token: string,
    author: string,
    content: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, async (session) => {
      requireQuote(
        session.action === 'edit' &&
          session.stage === 'edit' &&
          session.quoteId &&
          session.revision,
        'Run /quote edit again to open a new form.',
      );
      await this.store.edit(
        actor,
        session.quoteId,
        session.revision,
        author,
        content,
      );
      await this.redis.del(this.key(token));
      return this.reply('Quote updated.', 'success');
    });
  }

  async removal(
    actor: QuoteActor,
    token: string,
    id: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, async (session) => {
      this.selected(session, 'remove', id);
      const quote = await this.store.managed(actor, id);
      session.stage = 'confirm';
      session.quoteId = quote.id;
      session.revision = quote.revision;
      await this.save(token, session);
      const reply = this.reply(
        'Remove this quote? This cannot be undone.',
        'warning',
      );
      return {
        ...reply,
        embeds: [...reply.embeds, quoteEmbed(quote)],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`quote/confirm/${token}`)
              .setLabel('Remove quote')
              .setStyle(ButtonStyle.Danger),
            this.cancelButton(token),
          ),
        ],
        allowedMentions: { parse: [] },
      };
    });
  }

  async confirm(
    actor: QuoteActor,
    token: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, async (session) => {
      requireQuote(
        session.action === 'remove' &&
          session.stage === 'confirm' &&
          session.quoteId &&
          session.revision,
        'Select a quote and confirm its removal first.',
      );
      await this.store.remove(actor, session.quoteId, session.revision);
      await this.redis.del(this.key(token));
      return this.reply('Quote removed.', 'success');
    });
  }

  async cancel(
    actor: QuoteActor,
    token: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, async (session) => {
      requireQuote(
        session.action !== 'show',
        'Use the quote navigation buttons.',
      );
      await this.redis.del(this.key(token));
      return this.reply('Selection cancelled.');
    });
  }

  private async renderBrowse(
    actor: QuoteActor,
    token: string,
    session: Session,
  ): Promise<InteractionEditReplyOptions> {
    const quotes = await this.store.list(actor, session.author);
    const pages = quotePages(quotes);
    if (!pages.length) {
      await this.redis.del(this.key(token));
      return this.reply(
        session.author !== undefined
          ? 'No quotes found for this author.'
          : 'No quotes saved yet.',
      );
    }
    session.page = Math.min(session.page, pages.length);
    if (pages.length > 1) await this.save(token, session);
    else await this.redis.del(this.key(token));
    const title = `${session.author !== undefined ? quotes[0].author : (actor.guildName ?? 'Server')} · Quotes`;
    const counter = `Page ${session.page} of ${pages.length} · ${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'}`;
    return {
      content: '',
      embeds: [quoteListEmbed(pages[session.page - 1], title, counter)],
      components:
        pages.length > 1
          ? [
              this.navigation(
                'browse',
                token,
                session.page === 1,
                session.page === pages.length,
              ),
            ]
          : [],
      allowedMentions: { parse: [] },
    };
  }

  private async renderSelection(
    actor: QuoteActor,
    token: string,
    session: Session,
  ): Promise<InteractionEditReplyOptions> {
    const result = await this.store.manageable(actor, session.page);
    if (!result.quotes.length) {
      await this.redis.del(this.key(token));
      return this.reply('No quotes available for you to manage.');
    }
    session.page = result.page;
    session.offered = result.quotes.map((quote) => quote.id);
    await this.save(token, session);
    const clip = (text: string) =>
      text.slice(0, 100).replace(/[\uD800-\uDBFF]$/, '');
    return {
      ...this.reply(
        `Select a quote to ${session.action}. Page ${result.page} / ${result.pages}.`,
      ),
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`quote/${session.action}/${token}`)
            .setPlaceholder('Choose a quote')
            .addOptions(
              result.quotes.map((quote) => ({
                label: clip(quote.content.replace(/\s+/gu, ' ')),
                description: clip(quote.author),
                value: quote.id,
              })),
            ),
        ),
        this.navigation(
          'page',
          token,
          result.page === 1,
          result.page === result.pages,
        ).addComponents(this.cancelButton(token)),
      ],
      allowedMentions: { parse: [] },
    };
  }

  private navigation(
    route: string,
    token: string,
    first: boolean,
    last: boolean,
  ) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`quote/${route}/${token}/previous`)
        .setLabel('Previous')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(first),
      new ButtonBuilder()
        .setCustomId(`quote/${route}/${token}/next`)
        .setLabel('Next')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(last),
    );
  }

  private cancelButton(token: string) {
    return new ButtonBuilder()
      .setCustomId(`quote/cancel/${token}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);
  }

  private selected(session: Session, action: Session['action'], id: string) {
    requireQuote(
      session.action === action &&
        session.stage === 'select' &&
        session.offered.includes(id),
      'Choose a quote from this menu. Run the command again if it has changed.',
    );
  }

  private async save(token: string, session: Session): Promise<void> {
    await this.redis.set(this.key(token), JSON.stringify(session), 'EX', TTL);
  }

  private key(token: string): string {
    return `quotes:session:${token}`;
  }

  private async locked<T>(
    actor: QuoteActor,
    token: string,
    run: (session: Session) => Promise<T>,
  ): Promise<T> {
    requireQuote(
      z.string().uuid().safeParse(token).success,
      'This quote menu has expired. Run the command again.',
    );
    const key = this.key(token),
      lock = `${key}:lock`,
      owner = randomUUID();
    requireQuote(
      await this.redis.set(lock, owner, 'PX', 60_000, 'NX'),
      'This action is already being processed. Please wait.',
    );
    try {
      const value = await this.redis.get(key);
      requireQuote(
        value,
        'This quote menu has expired. Run the command again.',
      );
      const session = sessionSchema.parse(JSON.parse(value));
      requireQuote(
        session.guildId === actor.guildId &&
          session.channelId === actor.channelId &&
          session.userId === actor.userId,
        'This menu belongs to another user or channel. Run your own /quote command.',
      );
      await this.store.gate(actor);
      return await run(session);
    } finally {
      await this.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        lock,
        owner,
      );
    }
  }
}
