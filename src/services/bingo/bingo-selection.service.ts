import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { z } from 'zod';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  escapeMarkdown,
  StringSelectMenuBuilder,
} from 'discord.js';
import type {
  InteractionEditReplyOptions,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { ProviderToken } from '@Enums/provider-token.enum';
import { BingoStoreService } from './bingo-store.service';
import type { BingoActor } from './bingo-store.service';
import { BingoDiscordService } from './bingo-discord.service';
import { bingoLabel, requireBingo } from './bingo-rules';

export const bingoAction = z.enum([
  'show',
  'archive',
  'restore',
  'transfer',
  'contributor-add',
  'contributor-remove',
  'phrase-add',
  'phrase-edit',
  'phrase-remove',
  'start',
]);
export type BingoSelectionAction = z.infer<typeof bingoAction>;
const sessionSchema = z.object({
  guildId: z.string(),
  channelId: z.string(),
  userId: z.string(),
  action: bingoAction,
  stage: z.enum(['set', 'phrase', 'details']),
  page: z.number().int().positive(),
  input: z.object({
    text: z.string().optional(),
    userId: z.string().optional(),
    size: z.number().optional(),
    includeArchived: z.boolean().optional(),
  }),
  setId: z.string().uuid().optional(),
  offered: z.array(z.string().uuid()),
});
type Session = z.infer<typeof sessionSchema>;
type Input = Session['input'];
const TTL = 600;

@Injectable()
export class BingoSelectionService {
  constructor(
    private readonly store: BingoStoreService,
    private readonly discord: BingoDiscordService,
    @Inject(ProviderToken.REDIS) private readonly redis: Redis,
  ) {}

  async open(
    actor: BingoActor,
    action: BingoSelectionAction,
    input: Input = {},
  ): Promise<InteractionEditReplyOptions> {
    const token = randomUUID();
    const session: Session = {
      guildId: actor.guildId,
      channelId: actor.channelId,
      userId: actor.userId,
      action,
      input,
      stage: 'set',
      page: 1,
      offered: [],
    };
    return this.render(token, session, actor);
  }

  async choose(
    actor: BingoActor,
    token: string,
    selection: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, async (session) => {
      requireBingo(
        session.stage !== 'details' && session.offered.includes(selection),
        'Choose an item from this menu. Run the command again if the list has changed.',
      );
      if (session.stage === 'set') {
        session.setId = selection;
        session.page = 1;
        if (session.action === 'show') {
          session.stage = 'details';
          return this.render(token, session, actor);
        }
        if (
          session.action === 'phrase-edit' ||
          session.action === 'phrase-remove'
        ) {
          session.stage = 'phrase';
          return this.render(token, session, actor);
        }
      }
      const content = await this.execute(actor, session, selection);
      await this.redis.del(this.key(token));
      return {
        embeds: [
          new EmbedBuilder()
            .setTitle('Bingo')
            .setDescription(content)
            .setColor(0x69ddb0),
        ],
        components: [],
        allowedMentions: { parse: [] },
      };
    });
  }

  async page(
    actor: BingoActor,
    token: string,
    page: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, async (session) => {
      requireBingo(
        /^\d{1,6}$/.test(page) && Number(page) > 0,
        'Choose a valid menu page.',
      );
      session.page = Number(page);
      return this.render(token, session, actor);
    });
  }

  async cancel(
    actor: BingoActor,
    token: string,
  ): Promise<InteractionEditReplyOptions> {
    return this.locked(actor, token, async () => {
      await this.redis.del(this.key(token));
      return {
        content: 'Selection cancelled.',
        embeds: [],
        components: [],
        allowedMentions: { parse: [] },
      };
    });
  }

  private async render(
    token: string,
    session: Session,
    actor: BingoActor,
  ): Promise<InteractionEditReplyOptions> {
    await this.store.gate(actor);
    const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
    let title: string, description: string, total: number, perPage: number;
    if (session.stage === 'details') {
      const result = await this.store.show(actor, session.setId!, session.page);
      total = result.total;
      perPage = 10;
      title = result.set.name;
      description =
        `${result.set.archived ? 'Archived · ' : ''}Owner: <@${result.set.ownerId}> · Contributors: ${result.contributors}\n${total} phrase(s)\n\n` +
        (result.phrases
          .map((p) => `${escapeMarkdown(p.text)}\nAdded by <@${p.authorId}>`)
          .join('\n\n') || 'No phrases on this page.');
    } else {
      const result = await this.store.selectionItems(
        actor,
        session.action,
        session.page,
        session.setId,
        session.stage === 'phrase',
        session.input.includeArchived,
      );
      total = result.total;
      perPage = 25;
      requireBingo(
        total > 0,
        session.stage === 'set'
          ? 'No eligible bingo sets. Create a set with /bingo set create or ask its owner for access.'
          : 'No phrases you can change in this set.',
      );
      session.offered = result.items.map((item) => item.value);
      title =
        session.stage === 'set' ? 'Choose a bingo set' : 'Choose a phrase';
      description =
        session.stage === 'set'
          ? this.prompt(session.action)
          : 'Select the phrase you want to ' +
            (session.action === 'phrase-edit' ? 'edit.' : 'remove.');
      if (session.input.text)
        description += `\n\n${session.action === 'phrase-edit' ? 'New text' : 'Phrase'}: ${escapeMarkdown(session.input.text)}`;
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`bingo/pick/${token}`)
        .setPlaceholder(title)
        .addOptions(
          result.items.map((item) => ({
            label: bingoLabel(item.label),
            description: bingoLabel(item.description),
            value: item.value,
          })),
        );
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
      );
    }
    const pages = Math.max(1, Math.ceil(total / perPage));
    requireBingo(
      session.page <= pages,
      'This page is no longer available. Run the command again.',
    );
    const navigation = new ActionRowBuilder<ButtonBuilder>();
    if (pages > 1)
      navigation.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `bingo/pick-page/${token}/${Math.max(1, session.page - 1)}`,
          )
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(session.page === 1),
        new ButtonBuilder()
          .setCustomId(`bingo/pick-page/${token}/${session.page + 1}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(session.page === pages),
      );
    navigation.addComponents(
      new ButtonBuilder()
        .setCustomId(`bingo/pick-cancel/${token}`)
        .setLabel('Close')
        .setStyle(ButtonStyle.Secondary),
    );
    components.push(navigation);
    await this.redis.set(this.key(token), JSON.stringify(session), 'EX', TTL);
    return {
      content: null,
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setFooter({ text: `Page ${session.page}/${pages}` })
          .setColor(0x69ddb0),
      ],
      components,
      allowedMentions: { parse: [] },
    };
  }

  private prompt(action: BingoSelectionAction): string {
    return {
      show: 'Select a set to browse its phrases.',
      archive: 'Select the set to archive. Existing games will continue.',
      restore: 'Select the archived set to restore.',
      transfer: 'Select the set whose ownership you want to transfer.',
      'contributor-add': 'Select the set for this contributor.',
      'contributor-remove': 'Select the set to remove contributor access from.',
      'phrase-add': 'Select the set to add your phrase to.',
      'phrase-edit': 'First select the set containing your phrase.',
      'phrase-remove': 'First select the set containing the phrase to remove.',
      start: 'Select a set to start a game on this channel.',
    }[action];
  }

  private async execute(
    actor: BingoActor,
    session: Session,
    choice: string,
  ): Promise<string> {
    const setId = session.setId!;
    switch (session.action) {
      case 'archive':
        await this.store.archive(actor, setId, true);
        return 'Set archived. Existing games can continue.';
      case 'restore':
        await this.store.archive(actor, setId, false);
        return 'Set restored.';
      case 'transfer':
        await this.discord.member(actor.guildId, session.input.userId!);
        await this.store.transfer(actor, setId, session.input.userId!);
        return `Set ownership transferred to <@${session.input.userId}>.`;
      case 'contributor-add':
        await this.discord.member(actor.guildId, session.input.userId!);
        await this.store.contributor(actor, setId, session.input.userId!, true);
        return `Contributor access granted to <@${session.input.userId}>.`;
      case 'contributor-remove':
        await this.store.contributor(
          actor,
          setId,
          session.input.userId!,
          false,
        );
        return `Contributor access revoked for <@${session.input.userId}>.`;
      case 'phrase-add':
        await this.store.phrase(actor, setId, 'add', session.input.text);
        return 'Phrase added.';
      case 'phrase-edit':
        await this.store.phrase(
          actor,
          setId,
          'edit',
          session.input.text,
          choice,
        );
        return 'Phrase updated. Existing boards have not changed.';
      case 'phrase-remove':
        await this.store.phrase(actor, setId, 'remove', undefined, choice);
        return 'Phrase removed. Existing boards have not changed.';
      case 'start': {
        const game = await this.store.start(actor, setId, session.input.size!);
        return `Game started.\n${await this.discord.publish(game.id)}`;
      }
      default:
        throw new Error('Unexpected bingo selection action');
    }
  }

  private async locked<T>(
    actor: BingoActor,
    token: string,
    run: (session: Session) => Promise<T>,
  ): Promise<T> {
    requireBingo(
      /^[\da-f-]{36}$/i.test(token),
      'This menu has expired. Run the command again.',
    );
    const key = this.key(token),
      lockKey = key + ':lock',
      owner = randomUUID();
    requireBingo(
      await this.redis.set(lockKey, owner, 'PX', 60_000, 'NX'),
      'This selection is already being processed. Please wait.',
    );
    try {
      const value = await this.redis.get(key);
      requireBingo(value, 'This menu has expired. Run the command again.');
      const session = sessionSchema.parse(JSON.parse(value));
      requireBingo(
        session.guildId === actor.guildId &&
          session.channelId === actor.channelId &&
          session.userId === actor.userId,
        'This menu belongs to another user or channel. Run your own command.',
      );
      await this.store.gate(actor);
      return await run(session);
    } finally {
      await this.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        lockKey,
        owner,
      );
    }
  }
  private key(token: string): string {
    return `bingo:selection:${token}`;
  }
}
