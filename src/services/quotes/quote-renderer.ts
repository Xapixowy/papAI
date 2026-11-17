import { EmbedBuilder, escapeMarkdown } from 'discord.js';
import type { Quote } from '@Database/entities/quote.entity';
import type { EmbedBuilderService } from '@Services/discord/embed-builder.service';
import type { EmbedVariant } from '@Types/discord/embed-variant.type';

const DESCRIPTION_MAX = 4096;

export interface QuoteListPage {
  description: string;
  footerAuthor?: string;
}

const quotation = (quote: Quote) => `“${escapeMarkdown(quote.content)}”`;

export function quoteEmbed(quote: Quote): EmbedBuilder {
  return new EmbedBuilder()
    .setDescription(quotation(quote))
    .setFooter({ text: `— ${quote.author}` });
}

/** Pack complete quotations using their actual rendered length, including escaping. */
export function quotePages(quotes: Quote[]): QuoteListPage[] {
  const pages: QuoteListPage[] = [];
  let current = '';
  const flush = () => {
    if (current) pages.push({ description: current });
    current = '';
  };
  for (const quote of quotes) {
    const text = quotation(quote);
    const entry = `${text}\n— **${escapeMarkdown(quote.author)}**`;
    // An unusually escape-heavy quote still fits in full when its author uses the footer.
    if (entry.length > DESCRIPTION_MAX) {
      flush();
      pages.push({ description: text, footerAuthor: quote.author });
      continue;
    }
    const joined = current ? `${current}\n\n${entry}` : entry;
    if (joined.length > DESCRIPTION_MAX) {
      flush();
      current = entry;
    } else current = joined;
  }
  flush();
  return pages;
}

export function quoteListEmbed(
  page: QuoteListPage,
  title: string,
  counter: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(page.description)
    .setFooter({
      text: page.footerAuthor ? `— ${page.footerAuthor} · ${counter}` : counter,
    });
}

export function quoteReply(
  builder: EmbedBuilderService,
  description: string,
  variant: EmbedVariant = 'info',
  title?: string,
) {
  return {
    content: '',
    embeds: builder.simple({ description, variant, title }),
    components: [],
    allowedMentions: { parse: [] },
  };
}
