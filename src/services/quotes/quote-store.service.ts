import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { Quote, QuoteRandomState } from '@Database/entities/quote.entity';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import {
  quoteAuthorFilter,
  QuoteError,
  quoteId,
  quoteInput,
  requireQuote,
} from './quote-rules';

export interface QuoteActor {
  guildId: string;
  channelId: string;
  userId: string;
  manageGuild: boolean;
  guildName?: string;
}

@Injectable()
export class QuoteStoreService {
  constructor(private readonly db: DataSource) {}

  async gate(actor: QuoteActor, manager = this.db.manager): Promise<void> {
    const guild = await manager
      .getRepository(DiscordGuild)
      .findOneBy({ id: actor.guildId });
    requireQuote(
      guild?.features.includes(DiscordFeature.QUOTES),
      'Quotes are not enabled on this server. Ask a bot administrator to enable them.',
    );
  }

  async add(
    actor: QuoteActor,
    author: string,
    content: string,
  ): Promise<Quote> {
    await this.gate(actor);
    const input = quoteInput(author, content);
    return this.unique(() =>
      this.db
        .getRepository(Quote)
        .save({ ...input, guildId: actor.guildId, submitterId: actor.userId }),
    );
  }

  async managed(
    actor: QuoteActor,
    id: string,
    manager = this.db.manager,
    lock = false,
  ): Promise<Quote> {
    await this.gate(actor, manager);
    const quote = await manager.getRepository(Quote).findOne({
      where: { id: quoteId(id), guildId: actor.guildId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    requireQuote(
      quote,
      'This quote no longer exists on this server. Run the command again.',
    );
    requireQuote(
      actor.manageGuild || quote.submitterId === actor.userId,
      'You can only manage your own submissions unless you have Manage Server permission.',
    );
    return quote;
  }

  async edit(
    actor: QuoteActor,
    id: string,
    revision: number,
    author: string,
    content: string,
  ): Promise<void> {
    const input = quoteInput(author, content);
    await this.unique(() =>
      this.db.transaction(async (manager) => {
        const quote = await this.managed(actor, id, manager, true);
        requireQuote(
          quote.revision === revision,
          'This quote changed after you opened it. Run /quote edit again.',
        );
        await manager
          .getRepository(Quote)
          .save({ ...quote, ...input, revision: quote.revision + 1 });
      }),
    );
  }

  async remove(actor: QuoteActor, id: string, revision: number): Promise<void> {
    await this.db.transaction(async (manager) => {
      const quote = await this.managed(actor, id, manager, true);
      requireQuote(
        quote.revision === revision,
        'This quote changed after you selected it. Run /quote remove again to review it.',
      );
      await manager
        .getRepository(Quote)
        .delete({ id: quote.id, guildId: actor.guildId });
    });
  }

  async manageable(actor: QuoteActor, requestedPage: number) {
    await this.gate(actor);
    const where = {
      guildId: actor.guildId,
      ...(!actor.manageGuild ? { submitterId: actor.userId } : {}),
    };
    const repo = this.db.getRepository(Quote);
    const total = await repo.countBy(where);
    const pages = Math.max(1, Math.ceil(total / 25));
    const page = Math.min(pages, Math.max(1, requestedPage));
    const quotes = await repo.find({
      where,
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: (page - 1) * 25,
      take: 25,
    });
    return { quotes, total, page, pages };
  }

  async list(actor: QuoteActor, author?: string | null): Promise<Quote[]> {
    await this.gate(actor);
    const normalizedAuthor = quoteAuthorFilter(author);
    return this.db.getRepository(Quote).find({
      select: { id: true, author: true, content: true, createdAt: true },
      where: {
        guildId: actor.guildId,
        ...(normalizedAuthor !== undefined ? { normalizedAuthor } : {}),
      },
      order: { createdAt: 'DESC', id: 'ASC' },
    });
  }

  async random(
    actor: QuoteActor,
    author?: string | null,
    publish?: (quote: Quote | null) => Promise<void>,
  ): Promise<Quote | null> {
    return this.db.transaction(async (manager) => {
      await this.gate(actor, manager);
      // Keep publication and selection history ordered per channel across processes.
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`quotes:random:${actor.guildId}:${actor.channelId}`],
      );
      const states = manager.getRepository(QuoteRandomState);
      const key = { guildId: actor.guildId, channelId: actor.channelId };
      const state = await states.findOneBy(key);
      const candidates = manager
        .getRepository(Quote)
        .createQueryBuilder('quote')
        .where('quote.guildId = :guildId', actor);
      const normalized = quoteAuthorFilter(author);
      if (normalized !== undefined) {
        candidates.andWhere('quote.normalizedAuthor = :author', {
          author: normalized,
        });
      }
      const count = await candidates.getCount();
      if (!count) {
        await publish?.(null);
        return null;
      }
      if (count > 1 && state?.lastQuoteId)
        candidates.andWhere('quote.id <> :lastId', {
          lastId: state.lastQuoteId,
        });
      const quote = await candidates.orderBy('RANDOM()').getOne();
      requireQuote(quote, 'No matching quotes remain. Try again.');
      await publish?.(quote);
      await states.save({ ...key, lastQuoteId: quote.id });
      return quote;
    });
  }

  private async unique<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driver = error.driverError as {
          code?: string;
          constraint?: string;
        };
        if (
          driver.code === '23505' &&
          driver.constraint === 'UQ_quotes_duplicate'
        )
          throw new QuoteError(
            'This author and quote are already saved on this server.',
          );
      }
      throw error;
    }
  }
}
