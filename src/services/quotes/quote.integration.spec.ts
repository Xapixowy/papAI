import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { join } from 'node:path';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import {
  Client,
  MessageFlags,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  TextChannel,
} from 'discord.js';
import { Logger } from '@nestjs/common';
import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { Quote, QuoteRandomState } from '@Database/entities/quote.entity';
import { BingoSet } from '@Database/entities/bingo.entity';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { QuoteCommandsController } from '@Controllers/discord/quote-commands.controller';
import { QuoteStoreService } from './quote-store.service';
import type { QuoteActor } from './quote-store.service';
import { QuoteUiService } from './quote-ui.service';
import { QuoteDiscordService } from './quote-discord.service';
import { ConfigService } from '@nestjs/config';
import { EmbedBuilderService } from '@Services/discord/embed-builder.service';

const url = process.env.QUOTES_TEST_POSTGRES_URL;
const redisUrl = process.env.QUOTES_TEST_REDIS_URL;
const integration = url && redisUrl ? describe : describe.skip;

interface View {
  content?: string;
  embeds?: {
    title?: string;
    color?: number;
    author?: { name: string };
    description?: string;
    footer?: { text: string };
  }[];
  components?: {
    components: {
      custom_id: string;
      disabled?: boolean;
      options?: { label: string; value: string }[];
    }[];
  }[];
}
const view = (payload: unknown) => JSON.parse(JSON.stringify(payload)) as View;
const tokenFrom = (payload: unknown) =>
  view(payload).components![0].components[0].custom_id.split('/')[2];

integration(
  'Quotes with real PostgreSQL/Redis and simulated Discord transport',
  () => {
    const owner: QuoteActor = {
      guildId: '100000000000000001',
      channelId: '110000000000000001',
      userId: '120000000000000001',
      manageGuild: false,
      guildName: 'Quote Test Server',
    };
    const other = { ...owner, userId: '120000000000000002' };
    const manager = { ...other, manageGuild: true };
    const foreign = { ...manager, guildId: '100000000000000002' };
    let db: DataSource,
      redis: Redis,
      store: QuoteStoreService,
      ui: QuoteUiService,
      client: Client,
      discord: QuoteDiscordService,
      commands: QuoteCommandsController;
    let canManage = false,
      canView = true;

    beforeAll(async () => {
      const target = new URL(url!),
        cache = new URL(redisUrl!);
      if (
        !['localhost', '127.0.0.1'].includes(target.hostname) ||
        target.pathname !== '/pap_ai_quotes_test' ||
        !['localhost', '127.0.0.1'].includes(cache.hostname) ||
        cache.port !== '56389' ||
        cache.pathname !== '/14'
      ) {
        throw new Error(
          'Use only the dedicated local pap_ai_quotes_test database and Redis on port 56389, database 14.',
        );
      }
      db = new DataSource({
        type: 'postgres',
        url,
        synchronize: false,
        entities: [join(__dirname, '../../database/entities/*.entity.ts')],
        migrations: [join(__dirname, '../../database/migrations/*.ts')],
      });
      await db.initialize();
      await db.runMigrations();
      redis = new Redis(redisUrl!, { maxRetriesPerRequest: 0 });
      store = new QuoteStoreService(db);
      client = new Client({ intents: [] });
      const embeds = new EmbedBuilderService(
        client,
        new ConfigService({
          discord: {
            botName: 'Test bot',
            colors: {
              info: '#3498db',
              success: '#2ecc71',
              warning: '#f1c40f',
              error: '#e74c3c',
            },
          },
          app: { version: 'test' },
        }),
      );
      ui = new QuoteUiService(store, redis, embeds);
      const channel = {
        guildId: owner.guildId,
        isTextBased: () => true,
        isSendable: () => true,
        guild: {
          name: owner.guildName,
          members: {
            fetch: () =>
              Promise.resolve({
                permissions: new PermissionsBitField(
                  canManage ? [PermissionFlagsBits.ManageGuild] : [],
                ),
              }),
          },
        },
        permissionsFor: () =>
          new PermissionsBitField(
            canView ? [PermissionFlagsBits.ViewChannel] : [],
          ),
      };
      jest
        .spyOn(client.channels, 'fetch')
        .mockResolvedValue(channel as unknown as TextChannel);
      discord = new QuoteDiscordService(client, embeds);
      commands = new QuoteCommandsController(store, ui, discord);
    });

    beforeEach(async () => {
      await db.query('DELETE FROM discord_guilds');
      await redis.flushdb();
      await db.getRepository(DiscordGuild).save(
        [owner.guildId, foreign.guildId].map((id) => ({
          id,
          features: [
            DiscordFeature.QUOTES,
            DiscordFeature.BINGO,
            DiscordFeature.HUMAN,
          ],
        })),
      );
      canManage = false;
      canView = true;
    });
    afterAll(async () => {
      await redis?.quit();
      if (db?.isInitialized) await db.destroy();
      await client?.destroy();
    });

    const add = (
      content = 'A memorable line',
      author = 'Author',
      actor = owner,
    ) => store.add(actor, author, content);
    const sortedQuotes = async (long = false) => {
      const quotes: Quote[] = [];
      for (let n = 0; n < 3; n++) {
        const quote = await add(
          `Quote ${n}${long ? '\n' + '\\'.repeat(1990) : ''}`,
        );
        await db.getRepository(Quote).update(quote.id, {
          createdAt: new Date(Date.UTC(2026, 10, 16, 12, n)),
        });
        quotes.push(
          await db.getRepository(Quote).findOneByOrFail({ id: quote.id }),
        );
      }
      return quotes;
    };

    it('persists author, submitter and multiline content; detects normalized duplicates per server', async () => {
      const quote = await add('First line\nSecond line', 'A famous person');
      expect(quote.submitterId).toBe(owner.userId);
      expect(quote.content).toBe('First line\nSecond line');
      await expect(
        add(' first LINE  second line ', 'A   FAMOUS PERSON'),
      ).rejects.toThrow('already saved');
      await expect(add(quote.content, 'Another author')).resolves.toBeDefined();
      await expect(
        add(quote.content, quote.author, foreign),
      ).resolves.toBeDefined();
      const restarted = new QuoteStoreService(db);
      expect(await restarted.list(owner)).toHaveLength(2);
      expect(await restarted.list(foreign)).toHaveLength(1);
    });

    it('enforces duplicate identity during concurrent creation', async () => {
      const results = await Promise.allSettled([add(), add()]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      expect(await db.getRepository(Quote).count()).toBe(1);
    });

    it('separates attribution from editing rights and isolates every mutation by server', async () => {
      const quote = await add('A quote', other.userId);
      await expect(
        store.edit(other, quote.id, 1, 'Changed', 'No'),
      ).rejects.toThrow('own submissions');
      await expect(store.remove(other, quote.id, 1)).rejects.toThrow(
        'own submissions',
      );
      await expect(
        store.edit(foreign, quote.id, 1, 'Changed', 'No'),
      ).rejects.toThrow('no longer exists');
      await expect(store.remove(foreign, quote.id, 1)).rejects.toThrow(
        'no longer exists',
      );
      await store.edit(owner, quote.id, 1, 'Corrected author', 'Updated\ntext');
      const current = await db
        .getRepository(Quote)
        .findOneByOrFail({ id: quote.id });
      expect(current.submitterId).toBe(owner.userId);
      expect(current.revision).toBe(2);
      expect(current.createdAt).toEqual(quote.createdAt);
      await expect(
        store.edit(manager, quote.id, 2, 'Moderator correction', 'No'),
      ).rejects.toThrow('own submissions');
      await expect(store.remove(manager, quote.id, 2)).rejects.toThrow(
        'own submissions',
      );
      expect(
        await db.getRepository(Quote).findOneByOrFail({ id: quote.id }),
      ).toEqual(current);
      await store.remove(owner, quote.id, 2);
      expect(await db.getRepository(Quote).count()).toBe(0);
    });

    it('lets administrators manage their own submissions without offering other members quotes', async () => {
      await add('Another member quote');
      const quote = await add('Administrator quote', 'Author', manager);
      expect(
        (await store.manageable(manager, 1)).quotes.map((q) => q.id),
      ).toEqual([quote.id]);
      await store.edit(
        manager,
        quote.id,
        1,
        'Corrected author',
        'Corrected text',
      );
      await store.remove(manager, quote.id, 2);
      for (const action of ['edit', 'remove'] as const) {
        const empty = view(await ui.open(manager, action));
        expect(empty.components).toEqual([]);
        expect(empty.embeds![0].description).toContain('No quotes');
      }
      expect(await db.getRepository(Quote).count()).toBe(1);
    });

    it('rejects invalid edits, duplicates and stale revisions without overwriting saved text', async () => {
      const first = await add('First'),
        second = await add('Second');
      await expect(
        store.edit(owner, first.id, 1, second.author, second.content),
      ).rejects.toThrow('already saved');
      await expect(store.edit(owner, first.id, 1, '', 'Valid')).rejects.toThrow(
        'Author',
      );
      await expect(
        store.edit(owner, first.id, 1, 'Author', 'x'.repeat(2001)),
      ).rejects.toThrow('2000');
      await store.edit(owner, first.id, 1, 'Author', 'New version');
      await expect(
        store.edit(owner, first.id, 1, 'Author', 'Stale overwrite'),
      ).rejects.toThrow('changed');
      expect(
        (await db.getRepository(Quote).findOneByOrFail({ id: first.id }))
          .content,
      ).toBe('New version');
    });

    it('paginates management selections beyond 25 and only offers authorized quotes', async () => {
      for (let n = 0; n < 26; n++) await add(`Quote ${n}`);
      await add('Someone else', 'Author', other);
      const first = await ui.open(owner, 'edit'),
        token = tokenFrom(first);
      expect(view(first).components![0].components[0].options).toHaveLength(25);
      const second = await ui.page(owner, token, 'next');
      expect(view(second).components![0].components[0].options).toHaveLength(1);
      expect((await store.manageable(other, 1)).total).toBe(1);
      expect((await store.manageable(manager, 1)).total).toBe(1);
      expect(view(second).embeds![0].description).toContain('Page 2 / 2');
    });

    it('shows several short quotes together and hides unnecessary navigation', async () => {
      await sortedQuotes();
      const result = view(await ui.open(owner, 'show'));
      expect(result.embeds![0].title).toBe('Quote Test Server · Quotes');
      expect(result.embeds![0].description).toBe(
        '“Quote 2”\n— **Author**\n\n“Quote 1”\n— **Author**\n\n“Quote 0”\n— **Author**',
      );
      expect(result.embeds![0].footer!.text).toBe('Page 1 of 1 · 3 quotes');
      expect(result.content).toBe('');
      expect(result.components).toEqual([]);
    });

    it('filters the list by author within the server and uses simple empty states without buttons', async () => {
      await add('One', 'Ada Lovelace');
      await add('Two', 'ADA LOVELACE');
      await add('Different author', 'Grace Hopper');
      await add('Foreign quote', 'Ada Lovelace', foreign);
      const filtered = view(await ui.open(owner, 'show', 'ada   lovelace'));
      expect(filtered.embeds![0].title!.toLowerCase()).toBe(
        'ada lovelace · quotes',
      );
      expect(filtered.embeds![0].description).toContain('One');
      expect(filtered.embeds![0].description).toContain('Two');
      expect(filtered.embeds![0].description).not.toContain('Different author');
      expect(filtered.embeds![0].description).not.toContain('Foreign quote');
      expect(filtered.embeds![0].footer!.text).toBe('Page 1 of 1 · 2 quotes');
      const missing = view(await ui.open(owner, 'show', 'Missing author'));
      expect(missing.embeds![0]).toMatchObject({
        title: 'Info',
        description: 'No quotes found for this author.',
      });
      expect(missing.components).toEqual([]);
      await expect(ui.open(owner, 'show', '   ')).rejects.toThrow('Author');
      await db.getRepository(Quote).delete({ guildId: owner.guildId });
      const empty = view(await ui.open(owner, 'show'));
      expect(empty.embeds![0]).toMatchObject({
        title: 'Info',
        description: 'No quotes saved yet.',
      });
      expect(empty.components).toEqual([]);
    });

    it('navigates full quote pages newest first with counters and disabled boundary buttons', async () => {
      const quotes = await sortedQuotes(true);
      const opened = await ui.open(owner, 'show'),
        token = tokenFrom(opened);
      expect(view(opened).embeds![0]).toMatchObject({
        title: 'Quote Test Server · Quotes',
        footer: { text: 'Page 1 of 3 · 3 quotes' },
      });
      expect(
        view(opened).components![0].components.map((button) => button.disabled),
      ).toEqual([true, false]);
      expect(
        view(await ui.navigate(owner, token, 'next')).embeds![0].description,
      ).toContain('Quote 1');
      const last = view(await ui.navigate(owner, token, 'next'));
      expect(last.embeds![0].footer!.text).toBe('Page 3 of 3 · 3 quotes');
      expect(
        last.components![0].components.map((button) => button.disabled),
      ).toEqual([false, true]);
      expect(
        view(await ui.navigate(owner, token, 'next')).embeds![0].description,
      ).toContain('Quote 0');
      await store.edit(
        owner,
        quotes[1].id,
        1,
        'Updated author',
        'Updated middle\n' + '\\'.repeat(1980),
      );
      expect(
        view(await ui.navigate(owner, token, 'previous')).embeds![0],
      ).toMatchObject({
        description: expect.stringContaining('Updated middle'),
      });
      expect(
        view(await ui.navigate(owner, token, 'next')).embeds![0].description,
      ).toContain('Quote 0');
    });

    it('reflows pages after insertions and deletions and removes navigation for an empty collection', async () => {
      const quotes = await sortedQuotes(true);
      const opened = await ui.open(owner, 'show'),
        token = tokenFrom(opened);
      await ui.navigate(owner, token, 'next');
      await store.remove(owner, quotes[1].id, 1);
      await add('New arrival');
      expect(
        view(await ui.navigate(owner, token, 'next')).embeds![0].description,
      ).toContain('Quote 0');
      await db.getRepository(Quote).delete({ guildId: owner.guildId });
      const empty = view(await ui.navigate(owner, token, 'previous'));
      expect(empty.embeds![0].description).toBe('No quotes saved yet.');
      expect(empty.components).toEqual([]);
    });

    it('uses a stable tie-breaker for quotes created at the same time', async () => {
      const first = await add('One'),
        second = await add('Two');
      await db
        .getRepository(Quote)
        .update(
          { guildId: owner.guildId },
          { createdAt: new Date('2026-11-16T12:00:00.123Z') },
        );
      expect((await store.list(owner)).map((quote) => quote.id)).toEqual(
        [first.id, second.id].sort(),
      );
    });

    it('binds sessions to user, channel and server, rejects forged choices and expires menus', async () => {
      const quote = await add(),
        notOffered = await add('Other member', 'Author', other);
      const token = tokenFrom(await ui.open(owner, 'edit'));
      await expect(ui.editForm(other, token, quote.id)).rejects.toThrow(
        'another user',
      );
      await expect(
        ui.editForm({ ...owner, channelId: 'elsewhere' }, token, quote.id),
      ).rejects.toThrow('another user');
      await expect(
        ui.editForm({ ...owner, guildId: foreign.guildId }, token, quote.id),
      ).rejects.toThrow('another user');
      await expect(ui.editForm(owner, token, notOffered.id)).rejects.toThrow(
        'from this menu',
      );
      await expect(ui.editForm(owner, token, 'invalid')).rejects.toThrow(
        'from this menu',
      );
      await redis.del(`quotes:session:${token}`);
      await expect(ui.editForm(owner, token, quote.id)).rejects.toThrow(
        'expired',
      );
      await sortedQuotes(true);
      const browser = tokenFrom(await ui.open(owner, 'show'));
      await expect(ui.navigate(other, browser, 'next')).rejects.toThrow(
        'another user',
      );
      await expect(ui.navigate(owner, browser, 'forged')).rejects.toThrow(
        'valid navigation',
      );
      await expect(ui.confirm(owner, browser)).rejects.toThrow('confirm');
    });

    it('edits through a prefilled form and consumes the session once', async () => {
      const quote = await add('Original\ntext', 'Original author');
      const token = tokenFrom(await ui.open(owner, 'edit'));
      const form = (await ui.editForm(owner, token, quote.id)).toJSON();
      expect(JSON.stringify(form)).toContain('Original\\ntext');
      await ui.saveEdit(owner, token, 'Revised author', 'Revised\ntext');
      expect(
        (await db.getRepository(Quote).findOneByOrFail({ id: quote.id }))
          .content,
      ).toBe('Revised\ntext');
      await expect(
        ui.saveEdit(owner, token, 'Replay', 'Replay'),
      ).rejects.toThrow('expired');
    });

    it('requires explicit removal confirmation, supports cancellation and blocks stale confirmations', async () => {
      const quote = await add();
      let token = tokenFrom(await ui.open(owner, 'remove'));
      await expect(ui.confirm(owner, token)).rejects.toThrow('confirm');
      const confirmation = await ui.removal(owner, token, quote.id);
      expect(view(confirmation).embeds![0]).toMatchObject({
        title: 'Warning',
        description: expect.stringContaining('Remove this quote?'),
      });
      expect(await db.getRepository(Quote).count()).toBe(1);
      await ui.cancel(owner, token);
      await expect(ui.confirm(owner, token)).rejects.toThrow('expired');
      token = tokenFrom(await ui.open(owner, 'remove'));
      await ui.removal(owner, token, quote.id);
      await store.edit(
        owner,
        quote.id,
        1,
        'Author',
        'Changed after confirmation',
      );
      await expect(ui.confirm(owner, token)).rejects.toThrow('changed');
      const fresh = tokenFrom(await ui.open(owner, 'remove'));
      await ui.removal(owner, fresh, quote.id);
      await ui.confirm(owner, fresh);
      await expect(ui.confirm(owner, fresh)).rejects.toThrow('expired');
      expect(await db.getRepository(Quote).count()).toBe(0);
    });

    it('rejects legacy administrator sessions and rechecks ownership before saving or confirming', async () => {
      await add();
      // Simulate sessions opened under the previous administrator override.
      const own = await add('Administrator quote', 'Author', manager);
      const token = tokenFrom(await ui.open(manager, 'edit'));
      await ui.editForm(manager, token, own.id);
      await db
        .getRepository(Quote)
        .update(own.id, { submitterId: owner.userId });
      await expect(ui.saveEdit(manager, token, 'No', 'No')).rejects.toThrow(
        'own submissions',
      );
      await db
        .getRepository(Quote)
        .update(own.id, { submitterId: manager.userId });
      const removal = tokenFrom(await ui.open(manager, 'remove'));
      await ui.removal(manager, removal, own.id);
      await db
        .getRepository(Quote)
        .update(own.id, { submitterId: owner.userId });
      await expect(ui.confirm(manager, removal)).rejects.toThrow(
        'own submissions',
      );
      expect(await db.getRepository(Quote).count()).toBe(2);
    });

    it('rechecks feature access after edit forms were opened', async () => {
      const quote = await add();
      const token = tokenFrom(await ui.open(owner, 'edit'));
      await ui.editForm(owner, token, quote.id);
      await db
        .getRepository(DiscordGuild)
        .update(owner.guildId, { features: [DiscordFeature.BINGO] });
      await expect(ui.saveEdit(owner, token, 'No', 'No')).rejects.toThrow(
        'not enabled',
      );
      await expect(store.random(owner)).rejects.toThrow('not enabled');
      await expect(store.remove(owner, quote.id, 1)).rejects.toThrow(
        'not enabled',
      );
      await expect(add('Disabled')).rejects.toThrow('not enabled');
    });

    it('avoids consecutive channel random repeats across restarts, respects authors and allows a sole match', async () => {
      const a = await add('One', 'Ada'),
        b = await add('Two', 'Ada');
      await add('Another author', 'Grace');
      await add('Foreign', 'Ada', foreign);
      const first = await store.random(owner, ' ADA ');
      expect([a.id, b.id]).toContain(first!.id);
      const second = await new QuoteStoreService(db).random(owner, 'ada');
      expect(second!.id).not.toBe(first!.id);
      expect(second!.guildId).toBe(owner.guildId);
      const grace = await store.random(owner, 'Grace');
      expect((await store.random(owner, 'Grace'))!.id).toBe(grace!.id);
      expect(await store.random(owner, 'Missing')).toBeNull();
      expect(await store.random(foreign, 'Grace')).toBeNull();
      await store.random({ ...owner, channelId: 'another-channel' }, 'Ada');
      expect(await db.getRepository(QuoteRandomState).count()).toBe(2);
    });

    it('serializes simultaneous random draws and repairs history when the last quote is deleted', async () => {
      const a = await add('One'),
        b = await add('Two');
      const picks = await Promise.all([
        store.random(owner),
        store.random(owner),
      ]);
      expect(new Set(picks.map((quote) => quote!.id))).toEqual(
        new Set([a.id, b.id]),
      );
      const state = await db.getRepository(QuoteRandomState).findOneByOrFail({
        guildId: owner.guildId,
        channelId: owner.channelId,
      });
      await store.remove(owner, state.lastQuoteId!, 1);
      expect((await store.random(owner))!.id).not.toBe(state.lastQuoteId);
    });

    it('keeps random publication ordered and leaves history unchanged when sending fails', async () => {
      await add('One');
      await add('Two');
      const first = await store.random(owner);
      await expect(
        store.random(owner, undefined, () =>
          Promise.reject(new Error('Delivery failed')),
        ),
      ).rejects.toThrow('Delivery failed');
      const state = await db.getRepository(QuoteRandomState).findOneByOrFail({
        guildId: owner.guildId,
        channelId: owner.channelId,
      });
      expect(state.lastQuoteId).toBe(first!.id);
      const delivered: string[] = [];
      let release!: () => void;
      let started!: () => void;
      const sending = new Promise<void>((resolve) => {
        started = resolve;
      });
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const a = store.random(owner, undefined, async (quote) => {
        started();
        await pending;
        delivered.push(quote!.id);
      });
      await sending;
      const b = store.random(owner, undefined, (quote) => {
        delivered.push(quote!.id);
        return Promise.resolve();
      });
      expect(delivered).toHaveLength(0);
      release();
      await Promise.all([a, b]);
      expect(delivered).toHaveLength(2);
      expect(delivered[0]).not.toBe(delivered[1]);
      expect(
        (
          await db.getRepository(QuoteRandomState).findOneByOrFail({
            guildId: owner.guildId,
            channelId: owner.channelId,
          })
        ).lastQuoteId,
      ).toBe(delivered[1]);
    });

    function interaction(
      userId = owner.userId,
      fields = { author: 'A speaker', content: 'First line\nSecond line' },
    ) {
      const i = {
        guildId: owner.guildId as string | null,
        channelId: owner.channelId,
        user: { id: userId },
        deferred: false,
        replied: false,
        fields: {
          getTextInputValue: (name: string) =>
            fields[name as keyof typeof fields],
        },
        isFromMessage: () => true,
        deferReply: jest
          .fn<(payload?: unknown) => Promise<void>>()
          .mockImplementation(() => {
            i.deferred = true;
            return Promise.resolve();
          }),
        deferUpdate: jest.fn<() => Promise<void>>().mockImplementation(() => {
          i.deferred = true;
          return Promise.resolve();
        }),
        editReply: jest
          .fn<(payload: unknown) => Promise<void>>()
          .mockResolvedValue(),
        reply: jest
          .fn<(payload: unknown) => Promise<void>>()
          .mockResolvedValue(),
        followUp: jest
          .fn<(payload: unknown) => Promise<void>>()
          .mockResolvedValue(),
        showModal: jest
          .fn<(payload: unknown) => Promise<void>>()
          .mockResolvedValue(),
        deleteReply: jest.fn<() => Promise<void>>().mockResolvedValue(),
      };
      return i;
    }
    const slash = (i: ReturnType<typeof interaction>) =>
      [i as unknown as ChatInputCommandInteraction] as [
        ChatInputCommandInteraction,
      ];
    const button = (i: ReturnType<typeof interaction>) =>
      [i as unknown as ButtonInteraction] as [ButtonInteraction];
    const select = (i: ReturnType<typeof interaction>) =>
      [i as unknown as StringSelectMenuInteraction] as [
        StringSelectMenuInteraction,
      ];
    const modal = (i: ReturnType<typeof interaction>) =>
      [i as unknown as ModalSubmitInteraction] as [ModalSubmitInteraction];
    const output = (i: ReturnType<typeof interaction>) =>
      i.editReply.mock.calls.at(-1)![0];

    it('executes add/list/edit/random/remove with private simple embeds and a minimalist random quote', async () => {
      const form = interaction();
      await commands.add(slash(form));
      expect(view(form.showModal.mock.calls[0][0]).components).toHaveLength(2);
      const save = interaction();
      await commands.saveAdd(modal(save));
      expect(save.deferReply).toHaveBeenCalledWith({
        flags: MessageFlags.Ephemeral,
      });
      expect(view(output(save)).embeds![0]).toMatchObject({
        title: 'Success',
        description: 'Quote added.',
        color: 0x2ecc71,
      });
      const quote = await db
        .getRepository(Quote)
        .findOneByOrFail({ guildId: owner.guildId });
      const show = interaction();
      await commands.list(slash(show), {});
      expect(show.deferReply).toHaveBeenCalledWith({
        flags: MessageFlags.Ephemeral,
      });
      expect(view(output(show)).embeds![0].description).toContain(
        'First line\nSecond line',
      );
      expect(view(output(show)).components).toEqual([]);
      const edit = interaction();
      await commands.edit(slash(edit));
      expect(edit.deferReply).toHaveBeenCalledWith({
        flags: MessageFlags.Ephemeral,
      });
      const editToken = tokenFrom(output(edit));
      const choose = interaction();
      await commands.selectEdit(select(choose), editToken, [quote.id]);
      expect(choose.showModal).toHaveBeenCalled();
      const submit = interaction(owner.userId, {
        author: 'Edited author',
        content: 'Edited\nquote',
      });
      await commands.saveEdit(modal(submit), editToken);
      expect(view(output(submit)).embeds![0]).toMatchObject({
        title: 'Success',
        description: 'Quote updated.',
      });
      const filtered = interaction();
      await commands.list(slash(filtered), { author: 'edited AUTHOR' });
      expect(view(output(filtered)).embeds![0].title).toBe(
        'Edited author · Quotes',
      );
      const random = interaction();
      await commands.random(slash(random), { author: 'edited AUTHOR' });
      expect(random.deferReply).toHaveBeenCalledWith({});
      expect(view(output(random)).embeds![0]).toEqual({
        description: '“Edited\nquote”',
        footer: { text: '— Edited author' },
      });
      const remove = interaction();
      await commands.remove(slash(remove));
      const removeToken = tokenFrom(output(remove));
      const selected = interaction();
      await commands.selectRemove(select(selected), removeToken, [quote.id]);
      expect(view(output(selected)).embeds![0].description).toContain(
        'Remove this quote?',
      );
      const confirm = interaction();
      await commands.confirm(button(confirm), removeToken);
      expect(view(output(confirm)).embeds![0]).toMatchObject({
        title: 'Success',
        description: 'Quote removed.',
      });
      expect(await db.getRepository(Quote).count()).toBe(0);
      for (const i of [
        save,
        show,
        filtered,
        edit,
        submit,
        random,
        remove,
        selected,
        confirm,
      ]) {
        expect(i.followUp).not.toHaveBeenCalled();
        expect(view(output(i))).toMatchObject({});
        expect(output(i)).toHaveProperty('allowedMentions', { parse: [] });
      }
    });

    it.each([undefined, null, true, false])(
      'uses private quote lists unless ephemeral is explicitly false (%s)',
      async (ephemeral) => {
        await add('A filtered quote', 'Ada');
        await add('Other author', 'Grace');
        const list = interaction();
        await commands.list(slash(list), { author: 'ada', ephemeral });
        expect(list.deferReply).toHaveBeenCalledWith(
          ephemeral === false ? {} : { flags: MessageFlags.Ephemeral },
        );
        const result = view(output(list));
        expect(result.embeds![0].title).toBe('Ada · Quotes');
        expect(result.embeds![0].description).toContain('A filtered quote');
        expect(result.embeds![0].description).not.toContain('Other author');
      },
    );

    it('keeps private list pagination on the original private response', async () => {
      await sortedQuotes(true);
      const list = interaction();
      await commands.list(slash(list), {});
      expect(list.deferReply).toHaveBeenCalledWith({
        flags: MessageFlags.Ephemeral,
      });
      const next = interaction();
      await commands.browse(button(next), tokenFrom(output(list)), 'next');
      expect(next.deferUpdate).toHaveBeenCalled();
      expect(next.deferReply).not.toHaveBeenCalled();
      expect(next.followUp).not.toHaveBeenCalled();
      expect(view(output(next)).embeds![0].footer!.text).toBe(
        'Page 2 of 3 · 3 quotes',
      );
    });

    it('fetches current member permissions and privately rejects unauthorized public-button use', async () => {
      const quote = await add();
      await sortedQuotes(true);
      const show = interaction();
      await commands.list(slash(show), { ephemeral: false });
      const stolen = interaction(other.userId);
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      try {
        await commands.browse(button(stolen), tokenFrom(output(show)), 'next');
        expect(stolen.editReply).not.toHaveBeenCalled();
        expect(stolen.followUp).toHaveBeenCalledWith(
          expect.objectContaining({
            flags: MessageFlags.Ephemeral,
            embeds: [
              expect.objectContaining({
                data: expect.objectContaining({
                  title: 'Error',
                  description: expect.stringContaining('another user'),
                }),
              }),
            ],
          }),
        );
        canManage = true;
        expect(
          (
            await discord.actor(
              interaction(
                other.userId,
              ) as unknown as ChatInputCommandInteraction,
            )
          ).manageGuild,
        ).toBe(true);
        canManage = false;
        expect(
          (
            await discord.actor(
              interaction(
                other.userId,
              ) as unknown as ChatInputCommandInteraction,
            )
          ).manageGuild,
        ).toBe(false);
        canView = false;
        const denied = interaction();
        await commands.remove(slash(denied));
        expect(view(output(denied)).embeds![0].description).toContain(
          'no longer have access',
        );
        expect(
          await db.getRepository(Quote).findOneBy({ id: quote.id }),
        ).not.toBeNull();
      } finally {
        warn.mockRestore();
      }
    });

    it('reports unexpected errors privately without exposing database payloads in logs', async () => {
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      const failing = jest
        .spyOn(store, 'list')
        .mockRejectedValueOnce(new Error('private-payload-do-not-print'));
      try {
        const show = interaction();
        await commands.list(slash(show), { ephemeral: false });
        expect(show.deleteReply).toHaveBeenCalled();
        expect(show.followUp).toHaveBeenCalledWith(
          expect.objectContaining({
            flags: MessageFlags.Ephemeral,
            embeds: [
              expect.objectContaining({
                data: expect.objectContaining({
                  title: 'Error',
                  description: expect.stringContaining('error has been logged'),
                }),
              }),
            ],
          }),
        );
        expect(JSON.stringify(warn.mock.calls)).not.toContain(
          'private-payload-do-not-print',
        );
      } finally {
        warn.mockRestore();
        failing.mockRestore();
      }
    });

    it('reverts and reapplies only Quotes while preserving preexisting features and Bingo data', async () => {
      await add();
      const set = await db.getRepository(BingoSet).save({
        guildId: owner.guildId,
        ownerId: owner.userId,
        name: 'Keep this set',
      });
      await db.undoLastMigration();
      const guild = await db
        .getRepository(DiscordGuild)
        .findOneByOrFail({ id: owner.guildId });
      expect(guild.features).toEqual([
        DiscordFeature.BINGO,
        DiscordFeature.HUMAN,
      ]);
      expect(
        await db.getRepository(BingoSet).findOneBy({ id: set.id }),
      ).not.toBeNull();
      const tables = await db.query<{ name: string | null }[]>(
        "SELECT to_regclass('quotes')::text AS name",
      );
      expect(tables[0].name).toBeNull();
      await db.runMigrations();
      expect(await db.getRepository(Quote).count()).toBe(0);
      expect(
        await db.getRepository(BingoSet).findOneBy({ id: set.id }),
      ).not.toBeNull();
    });
  },
);
