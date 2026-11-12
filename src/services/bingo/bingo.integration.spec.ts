import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { join } from 'node:path';
import Redis from 'ioredis';
import { BingoSelectionService } from './bingo-selection.service';
import { BingoSelectionController } from '@Controllers/discord/bingo/bingo-selection.controller';
import { DataSource } from 'typeorm';
import {
  Client,
  Collection,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import type { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { Logger } from '@nestjs/common';
import {
  BingoContributor,
  BingoGame,
  BingoPhrase,
  BingoSet,
} from '@Database/entities/bingo.entity';
import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { DiscordChannel } from '@Database/entities/discord-channel.entity';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { BingoStoreService } from './bingo-store.service';
import type { BingoActor } from './bingo-store.service';
import { BingoDiscordService } from './bingo-discord.service';
import { BingoRendererService } from './bingo-renderer.service';
import { BingoRepliesService } from '@Controllers/discord/bingo/bingo-replies.service';
import { BingoSetController } from '@Controllers/discord/bingo/bingo-set.controller';
import { BingoContributorController } from '@Controllers/discord/bingo/bingo-contributor.controller';
import { BingoPhraseController } from '@Controllers/discord/bingo/bingo-phrase.controller';
import { BingoGameController } from '@Controllers/discord/bingo/bingo-game.controller';
import { BingoBoardActionsController } from '@Controllers/discord/bingo/bingo-board-actions.controller';
import { BingoInteractionController } from '@Controllers/discord/bingo/bingo-interaction.controller';
import type {
  Guild,
  StringSelectMenuInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
} from 'discord.js';

const url = process.env.BINGO_TEST_POSTGRES_URL;
const integration = url ? describe : describe.skip;
const redisUrl = process.env.BINGO_TEST_REDIS_URL;
const selectionTest = redisUrl ? it : it.skip;

integration('Bingo with PostgreSQL and simulated Discord transport', () => {
  const guildId = '100000000000000001',
    channelId = '110000000000000001';
  const owner: BingoActor = {
    guildId,
    channelId,
    userId: '120000000000000001',
    manageChannels: false,
    administrator: false,
  };
  const contributor = { ...owner, userId: '120000000000000002' };
  const player = { ...owner, userId: '120000000000000003' };
  const manager = {
    ...owner,
    userId: '120000000000000004',
    manageChannels: true,
  };
  const admin = { ...manager, administrator: true };
  const otherChannel = { ...owner, channelId: '110000000000000002' };
  const foreign = { ...admin, guildId: '100000000000000002' };
  let db: DataSource,
    store: BingoStoreService,
    discord: BingoDiscordService,
    client: Client;
  let redis: Redis | undefined;
  let selections: BingoSelectionService;
  let messages: Map<string, { id: string; edit: ReturnType<typeof jest.fn> }>;
  let nextMessage: number;
  const send =
    jest.fn<
      (
        payload: unknown,
      ) => Promise<{ id: string; edit: ReturnType<typeof jest.fn> }>
    >();
  const fetchMessage = jest.fn<
    (
      input:
        | string
        | {
            message?: string;
            force?: boolean;
            limit?: number;
            before?: string;
          },
    ) => Promise<unknown>
  >();
  const permissions = {
    has: (permission: unknown) =>
      permission === PermissionFlagsBits.Administrator ? false : true,
  };

  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/pap_ai_bingo_test'
    )
      throw new Error(
        'Use only the dedicated local pap_ai_bingo_test database.',
      );
    db = new DataSource({
      type: 'postgres',
      url,
      synchronize: false,
      entities: [join(__dirname, '../../database/entities/*.entity.ts')],
      migrations: [join(__dirname, '../../database/migrations/*.ts')],
    });
    await db.initialize();
    await db.runMigrations();
    store = new BingoStoreService(db);
    client = new Client({ intents: [] });
    jest.spyOn(client, 'isReady').mockReturnValue(true);
    const channel = {
      id: channelId,
      guildId,
      isTextBased: () => true,
      isSendable: () => true,
      isThread: () => false,
      permissionsFor: () => permissions,
      guild: {
        members: {
          fetch: () => Promise.resolve({ permissions, user: { bot: false } }),
          fetchMe: () => Promise.resolve({ id: 'bot' }),
        },
      },
      messages: { fetch: fetchMessage },
      send,
    };
    jest
      .spyOn(client.channels, 'fetch')
      .mockResolvedValue(channel as unknown as TextChannel);
    jest.spyOn(client.guilds, 'fetch').mockResolvedValue({
      members: { fetch: () => Promise.resolve({ user: { bot: false } }) },
    } as unknown as Guild);
    discord = new BingoDiscordService(
      db,
      store,
      new BingoRendererService(),
      client,
    );
    if (redisUrl) {
      const target = new URL(redisUrl);
      if (
        !['localhost', '127.0.0.1'].includes(target.hostname) ||
        target.port !== '56380' ||
        target.pathname !== '/14'
      )
        throw new Error(
          'Selection tests require dedicated local Redis on port 56380, database 14',
        );
      redis = new Redis(redisUrl, { maxRetriesPerRequest: 0 });
      await redis.ping();
    }
    selections = new BingoSelectionService(store, discord, redis!);
  });

  beforeEach(async () => {
    await db.query(
      'TRUNCATE bingo_games, bingo_phrases, bingo_contributors, bingo_sets, discord_guilds CASCADE',
    );
    await db.getRepository(DiscordGuild).save([
      { id: guildId, features: [DiscordFeature.BINGO] },
      { id: foreign.guildId, features: [DiscordFeature.BINGO] },
    ]);
    for (const channel of [owner, otherChannel])
      await db.getRepository(DiscordChannel).save({
        id: channel.channelId,
        name: 'bingo-test',
        discordGuildId: guildId,
        features: { [DiscordChannelFeature.BINGO]: true },
      });
    if (redis) await redis.flushdb();
    messages = new Map();
    nextMessage = 2000;
    send.mockReset().mockImplementation((payload) => {
      const message = {
        id: String(nextMessage++),
        content: (payload as { content?: string }).content ?? '',
        author: { id: 'bot' },
        createdTimestamp: Date.now(),
        edit: jest.fn<() => Promise<void>>().mockResolvedValue(),
      };
      messages.set(message.id, message);
      return Promise.resolve(message);
    });
    fetchMessage.mockReset().mockImplementation((input) => {
      if (typeof input !== 'string' && input.limit)
        return Promise.resolve(
          new Collection(
            [...messages]
              .filter(
                ([id]) => !input.before || Number(id) < Number(input.before),
              )
              .sort(([a], [b]) => Number(b) - Number(a))
              .slice(0, input.limit),
          ),
        );
      const message = messages.get(
        typeof input === 'string' ? input : input.message,
      );
      return message
        ? Promise.resolve(message)
        : Promise.reject(
            Object.assign(new Error('Deleted message'), { code: 10008 }),
          );
    });
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    await client?.destroy();
    if (redis) await redis.quit();
  });

  async function ready(count = 25) {
    const set = await store.create(owner, 'Raid Bingo');
    await store.contributor(owner, set.id, contributor.userId, true);
    for (let i = 0; i < count; i++)
      await store.phrase(contributor, set.id, 'add', `Phrase ${i}`);
    return set;
  }
  async function game(size = 3) {
    const set = await ready();
    const created = await store.start(owner, set.id, size);
    await discord.publish(created.id);
    return {
      set,
      board: await db
        .getRepository(BingoGame)
        .findOneByOrFail({ id: created.id }),
    };
  }

  it('enforces contributor access, own-phrase edits, duplicate checks and immediate revocation', async () => {
    const set = await ready(1);
    const phrase = (await store.show(owner, set.id)).phrases[0];
    await expect(store.phrase(player, set.id, 'add', 'Denied')).rejects.toThrow(
      'invited',
    );
    await expect(
      store.phrase(contributor, set.id, 'add', ' PHRASE   0 '),
    ).rejects.toThrow('already contains');
    await store.phrase(contributor, set.id, 'edit', 'Edited', phrase.id);
    await store.contributor(owner, set.id, player.userId, true);
    await expect(
      store.phrase(player, set.id, 'remove', undefined, phrase.id),
    ).rejects.toThrow('own phrases');
    await store.contributor(owner, set.id, contributor.userId, false);
    await expect(
      store.phrase(contributor, set.id, 'edit', 'Denied', phrase.id),
    ).rejects.toThrow('invited');
    await store.phrase(owner, set.id, 'remove', undefined, phrase.id);
    expect((await store.show(owner, set.id)).total).toBe(0);
  });

  it('scopes catalogs, suggestions and mutations to the current server', async () => {
    const set = await ready(1);
    expect((await store.list(foreign, 1))[1]).toBe(0);
    expect((await store.selectionItems(foreign, 'show', 1)).items).toEqual([]);
    for (const action of [
      () => store.show(foreign, set.id),
      () => store.archive(foreign, set.id, true),
      () => store.phrase(foreign, set.id, 'add', 'Foreign'),
      () => store.selectionItems(foreign, 'phrase-edit', 1, set.id, true),
    ])
      await expect(action()).rejects.toThrow('not found');
    expect(
      (await store.selectionItems(player, 'show', 1)).items[0],
    ).toMatchObject({ label: 'Raid Bingo', value: set.id });
    expect(
      (await store.selectionItems(owner, 'phrase-edit', 1, set.id, true))
        .items[0].label,
    ).toBe('Phrase 0');
  });

  it('rejects too-small pools and permits only one concurrent active game per channel, even from different sets', async () => {
    const small = await ready(8);
    await expect(store.start(owner, small.id, 3)).rejects.toThrow('1 more');
    const first = await ready(),
      second = await ready();
    await expect(store.start(player, first.id, 3)).rejects.toThrow(
      'Manage Channels',
    );
    const results = await Promise.allSettled([
      store.start(owner, first.id, 3),
      store.start(owner, second.id, 3),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.getRepository(BingoGame).count()).toBe(1);
    await store.start(otherChannel, first.id, 4);
    expect(await db.getRepository(BingoGame).count()).toBe(2);
  });

  it('keeps independent board snapshots after pool edits, deletion and archival', async () => {
    const { set, board } = await game();
    const snapshot = structuredClone(board.cells);
    const other = await store.start(otherChannel, set.id, 5);
    await store.phrase(
      owner,
      set.id,
      'remove',
      undefined,
      board.cells[0].phraseId,
    );
    await store.archive(owner, set.id, true);
    expect((await store.list(owner, 1))[1]).toBe(0);
    expect((await store.list(owner, 1, true))[1]).toBe(1);
    await store.mark(player, board.id, board.messageId!, 0);
    expect(
      (
        await db.getRepository(BingoGame).findOneByOrFail({ id: board.id })
      ).cells.map((c) => c.text),
    ).toEqual(snapshot.map((c) => c.text));
    expect(
      (
        await db.getRepository(BingoGame).findOneByOrFail({ id: other.id })
      ).cells.every((c) => !c.markedBy),
    ).toBe(true);
    await store.end(otherChannel);
    await expect(store.start(otherChannel, set.id, 3)).rejects.toThrow(
      'Archived',
    );
    await store.archive(admin, set.id, false);
    await store.start(otherChannel, set.id, 3);
  });

  it('preserves concurrent marks, ignores duplicate marks and checks undo authorship afresh', async () => {
    const { board } = await game();
    await Promise.all([
      store.mark(player, board.id, board.messageId!, 0),
      store.mark(contributor, board.id, board.messageId!, 1),
    ]);
    const current = await store.mark(owner, board.id, board.messageId!, 0);
    expect(current.cells[0].markedBy).toBe(player.userId);
    expect(current.cells[1].markedBy).toBe(contributor.userId);
    await expect(
      store.mark(contributor, board.id, board.messageId!, 0, true),
    ).rejects.toThrow('person who marked');
    await store.mark(player, board.id, board.messageId!, 0, true);
    await store.mark(manager, board.id, board.messageId!, 1, true);
    expect(
      (await store.board(owner, board.id, board.messageId!)).eligible,
    ).toEqual([]);
    await expect(
      store.mark(otherChannel, board.id, board.messageId!, 0),
    ).rejects.toThrow('no longer active');
    await expect(
      store.mark(player, board.id, 'forged-message', 0),
    ).rejects.toThrow('no longer active');
  });

  it.each(
    [3, 4, 5].flatMap((size) => [
      { size, pattern: 'row', line: Array.from({ length: size }, (_, i) => i) },
      {
        size,
        pattern: 'column',
        line: Array.from({ length: size }, (_, i) => i * size),
      },
      {
        size,
        pattern: 'main diagonal',
        line: Array.from({ length: size }, (_, i) => i * (size + 1)),
      },
      {
        size,
        pattern: 'opposite diagonal',
        line: Array.from({ length: size }, (_, i) => (i + 1) * (size - 1)),
      },
    ]),
  )(
    'automatically ends a $size board on its first $pattern',
    async ({ size, line }) => {
      const { set, board } = await game(size);
      for (const index of line.slice(0, -1)) {
        const partial = await store.mark(
          player,
          board.id,
          board.messageId!,
          index,
        );
        expect(partial.endedAt).toBeNull();
      }
      const won = await store.mark(
        player,
        board.id,
        board.messageId!,
        line.at(-1)!,
      );
      expect(won.bingoAt).not.toBeNull();
      expect(won.endedAt).toEqual(won.bingoAt);
      expect(won.endedAt).not.toBeNull();
      await expect(store.active(owner)).rejects.toThrow('no active');
      await expect(
        store.mark(player, board.id, board.messageId!, line[0], true),
      ).rejects.toThrow('no longer active');
      await expect(
        store.mark(player, board.id, board.messageId!, line[0]),
      ).rejects.toThrow('no longer active');
      const next = await store.start(owner, set.id, size);
      expect(next.endedAt).toBeNull();
      expect(next.id).not.toBe(board.id);
    },
  );

  it('announces bingo once and disables marking and undo when the game automatically ends', async () => {
    const { board } = await game();
    for (let i = 0; i < 3; i++)
      await store.mark(player, board.id, board.messageId!, i);
    await Promise.all([discord.publish(board.id), discord.publish(board.id)]);
    expect(send).toHaveBeenCalledTimes(2);
    await expect(
      store.mark(player, board.id, board.messageId!, 0, true),
    ).rejects.toThrow('no longer active');
    await expect(
      store.mark(player, board.id, board.messageId!, 0),
    ).rejects.toThrow('no longer active');
    await discord.publish(board.id);
    expect(send).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(send.mock.calls.at(-1))).toContain(
      'This game has ended',
    );
    await expect(
      store.mark(player, board.id, board.messageId!, 3),
    ).rejects.toThrow('no longer active');
    expect(
      JSON.stringify(messages.get(board.messageId!)!.edit.mock.calls.at(-1)),
    ).toContain('"disabled":true');
  });

  it.each([false, true])(
    'finalizes legacy wins idempotently without duplicate announcements (already announced: %s)',
    async (announced) => {
      const { set, board } = await game();
      let won = board;
      for (const index of [0, 1, 2])
        won = await store.mark(player, board.id, board.messageId!, index);
      if (announced) await discord.publish(board.id);
      await db
        .getRepository(BingoGame)
        .update(
          { id: board.id },
          { endedAt: null, syncedRevision: won.revision },
        );
      const untouched = await store.start(otherChannel, set.id, 3);
      await discord.retryPending();
      const stored = await db
        .getRepository(BingoGame)
        .findOneByOrFail({ id: board.id });
      expect(stored.endedAt).toEqual(won.bingoAt);
      expect(stored.cells).toEqual(won.cells);
      expect(stored.revision).toBe(won.revision + 1);
      expect(stored.syncedRevision).toBe(stored.revision);
      expect(stored.announcedAt).not.toBeNull();
      expect(send).toHaveBeenCalledTimes(3); // Original board, its announcement and the other channel's board.
      const active = await db
        .getRepository(BingoGame)
        .findOneByOrFail({ id: untouched.id });
      expect(active.endedAt).toBeNull();
      expect(active.revision).toBe(untouched.revision);
      await discord.retryPending();
      expect(
        (await db.getRepository(BingoGame).findOneByOrFail({ id: board.id }))
          .revision,
      ).toBe(stored.revision);
      expect(send).toHaveBeenCalledTimes(3);
    },
  );

  it('serializes simultaneous winning marks and keeps the final board immutable', async () => {
    const { board } = await game();
    for (const index of [0, 1, 3])
      await store.mark(player, board.id, board.messageId!, index);
    const results = await Promise.allSettled([
      store.mark(player, board.id, board.messageId!, 2),
      store.mark(contributor, board.id, board.messageId!, 6),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const stored = await db
      .getRepository(BingoGame)
      .findOneByOrFail({ id: board.id });
    expect(stored.endedAt).toEqual(stored.bingoAt);
    expect(stored.cells.filter((cell) => cell.markedBy)).toHaveLength(4);
    await Promise.all([discord.publish(board.id), discord.publish(board.id)]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('preserves progress when Discord fails and restores deleted messages without drawing again', async () => {
    const { board } = await game();
    await store.mark(player, board.id, board.messageId!, 0);
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const message = messages.get(board.messageId!)!;
    message.edit.mockRejectedValueOnce(
      Object.assign(new Error('Do not dump token'), { code: 50013 }),
    );
    await expect(discord.publish(board.id)).rejects.toThrow(
      'Progress is saved',
    );
    expect(logger.mock.calls.flat().join(' ')).toContain('50013');
    expect(logger.mock.calls.flat().join(' ')).not.toContain(
      'Do not dump token',
    );
    logger.mockRestore();
    const restarted = new BingoStoreService(db);
    expect((await restarted.active(player)).game.cells[0].markedBy).toBe(
      player.userId,
    );
    messages.delete(board.messageId!);
    const warns = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    await expect(discord.publish(board.id)).rejects.toThrow(
      'Progress is saved',
    );
    await discord.publish(board.id, (await restarted.active(owner)).canManage);
    warns.mockRestore();
    const restored = (await restarted.active(owner)).game;
    expect(restored.messageId).not.toBe(board.messageId);
    expect(restored.cells[0].markedBy).toBe(player.userId);
    expect(restored.cells.map((c) => c.text)).toEqual(
      board.cells.map((c) => c.text),
    );
    await expect(
      store.mark(player, board.id, board.messageId!, 1),
    ).rejects.toThrow('no longer active');
  });

  it('finds its previous announcement after a send succeeds but its database acknowledgement is lost', async () => {
    const { board } = await game();
    for (let i = 0; i < 3; i++)
      await store.mark(player, board.id, board.messageId!, i);
    await discord.publish(board.id);
    expect(send).toHaveBeenCalledTimes(2);
    await db
      .getRepository(BingoGame)
      .update({ id: board.id }, { announcedAt: null });
    await discord.retryPending();
    expect(send).toHaveBeenCalledTimes(2);
    expect(
      (await db.getRepository(BingoGame).findOneByOrFail({ id: board.id }))
        .announcedAt,
    ).not.toBeNull();
  });

  it('orders delayed Discord updates so an older image cannot overwrite newer progress', async () => {
    const { board } = await game();
    await store.mark(player, board.id, board.messageId!, 0);
    let release: () => void = () => undefined;
    let entered: () => void = () => undefined;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    messages.get(board.messageId!)!.edit.mockImplementationOnce(async () => {
      entered();
      await waiting;
    });
    const first = discord.publish(board.id);
    await started;
    await store.mark(contributor, board.id, board.messageId!, 1);
    const second = discord.publish(board.id);
    release();
    await Promise.all([first, second]);
    const stored = await db
      .getRepository(BingoGame)
      .findOneByOrFail({ id: board.id });
    expect(stored.syncedRevision).toBe(stored.revision);
    expect(
      JSON.stringify(messages.get(board.messageId!)!.edit.mock.calls.at(-1)),
    ).toContain(`bingo-${stored.revision}.png`);
  });

  it('retries persisted board updates and first-bingo announcements after transport failure', async () => {
    const { board } = await game();
    for (let i = 0; i < 3; i++)
      await store.mark(player, board.id, board.messageId!, i);
    const errors = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    send.mockRejectedValueOnce(
      Object.assign(new Error('Network failure'), { code: 'ECONNRESET' }),
    );
    await expect(discord.publish(board.id)).rejects.toThrow(
      'Progress is saved',
    );
    expect(
      (await db.getRepository(BingoGame).findOneByOrFail({ id: board.id }))
        .announcedAt,
    ).toBeNull();
    await discord.retryPending();
    errors.mockRestore();
    expect(
      (await db.getRepository(BingoGame).findOneByOrFail({ id: board.id }))
        .announcedAt,
    ).not.toBeNull();
    expect(send).toHaveBeenCalledTimes(3);
    await discord.retryPending();
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('recovers ownership through server administration and applies new ownership immediately', async () => {
    const set = await ready(1);
    await expect(store.transfer(player, set.id, player.userId)).rejects.toThrow(
      'owner',
    );
    await store.transfer(admin, set.id, player.userId);
    await expect(
      store.contributor(owner, set.id, contributor.userId, true),
    ).rejects.toThrow('owner');
    await store.archive(player, set.id, true);
    expect(
      await db
        .getRepository(BingoContributor)
        .existsBy({ setId: set.id, userId: player.userId }),
    ).toBe(false);
  });

  it('rechecks guild and channel feature switches on existing boards', async () => {
    const { board } = await game();
    await db
      .getRepository(DiscordChannel)
      .update(
        { id: channelId },
        { features: { [DiscordChannelFeature.BINGO]: false } },
      );
    await expect(
      store.mark(player, board.id, board.messageId!, 0),
    ).rejects.toThrow('not enabled on this channel');
    await db
      .getRepository(DiscordGuild)
      .update({ id: guildId }, { features: [] });
    await expect(store.list(owner, 1)).rejects.toThrow(
      'not enabled on this server',
    );
  });

  it('executes a slash command through the reply boundary and acknowledges before work', async () => {
    const interaction = {
      guildId,
      channelId,
      user: { id: owner.userId },
      deferred: false,
      replied: false,
      isChatInputCommand: () => true,
      commandName: 'bingo',
      options: {
        getSubcommandGroup: () => 'set',
        getSubcommand: () => 'create',
      },
      deferReply: jest.fn<() => Promise<void>>().mockImplementation(() => {
        interaction.deferred = true;
        return Promise.resolve();
      }),
      editReply: jest
        .fn<(value: unknown) => Promise<void>>()
        .mockResolvedValue(),
      reply: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };
    await new BingoSetController(
      store,
      new BingoRepliesService(discord),
      selections,
    ).create([interaction as unknown as ChatInputCommandInteraction], {
      name: 'Controller set',
    });
    expect(interaction.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    expect(JSON.stringify(interaction.editReply.mock.calls)).toContain(
      'Controller set',
    );
    expect(await db.getRepository(BingoSet).count()).toBe(1);
  });

  it('refreshes channel access and sends unexpected command diagnostics to the console', async () => {
    const channelFetch = jest.spyOn(client.channels, 'fetch');
    const denied = jest.spyOn(permissions, 'has').mockReturnValueOnce(false);
    await expect(
      discord.actor({ guildId, channelId, user: { id: owner.userId } }),
    ).rejects.toThrow('no longer have access');
    denied.mockRestore();
    expect(channelFetch).toHaveBeenCalledWith(channelId, {
      force: true,
    });
    const failure = jest.spyOn(store, 'create').mockRejectedValueOnce(
      Object.assign(new Error('secret request payload'), {
        code: 'TEST_FAILURE',
      }),
    );
    const stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
    const i = {
      guildId,
      channelId,
      user: { id: owner.userId },
      deferred: false,
      replied: false,
      isChatInputCommand: () => true,
      commandName: 'bingo',
      options: {
        getSubcommandGroup: () => 'set',
        getSubcommand: () => 'create',
      },
      deferReply: jest.fn<() => Promise<void>>().mockImplementation(() => {
        i.deferred = true;
        return Promise.resolve();
      }),
      editReply: jest
        .fn<(payload: unknown) => Promise<void>>()
        .mockResolvedValue(),
      reply: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };
    try {
      await new BingoSetController(
        store,
        new BingoRepliesService(discord),
        selections,
      ).create([i as unknown as ChatInputCommandInteraction], { name: 'Test' });
      const output = stderr.mock.calls.map(([chunk]) => String(chunk)).join('');
      expect(output).toContain('Bingo bingo set create failed');
      expect(output).toContain('TEST_FAILURE');
      expect(output).toContain(`channel=${channelId}`);
      expect(output).not.toContain('secret request payload');
      expect(JSON.stringify(i.editReply.mock.calls)).toContain(
        'The error has been logged',
      );
    } finally {
      stderr.mockRestore();
      failure.mockRestore();
    }
  });

  function boardInteraction(
    actor = owner,
    messageId = 'private',
    text = 'A phrase from the form',
  ) {
    const i = {
      guildId: actor.guildId,
      channelId: actor.channelId,
      user: { id: actor.userId },
      message: { id: messageId },
      customId: 'bingo/board/test',
      deferred: false,
      replied: false,
      isChatInputCommand: () => false,
      fields: { getTextInputValue: () => text },
      deferReply: jest.fn<() => Promise<void>>().mockImplementation(() => {
        i.deferred = true;
        return Promise.resolve();
      }),
      deferUpdate: jest.fn<() => Promise<void>>().mockResolvedValue(),
      showModal: jest
        .fn<(payload: unknown) => Promise<void>>()
        .mockResolvedValue(),
      editReply: jest
        .fn<(payload: unknown) => Promise<void>>()
        .mockResolvedValue(),
      followUp: jest
        .fn<(payload: unknown) => Promise<void>>()
        .mockResolvedValue(),
      reply: jest.fn<(payload: unknown) => Promise<void>>().mockResolvedValue(),
    };
    return i;
  }
  const button = (
    i: ReturnType<typeof boardInteraction>,
  ): [ButtonInteraction] => [i as unknown as ButtonInteraction];
  const selected = (
    i: ReturnType<typeof boardInteraction>,
  ): [StringSelectMenuInteraction] => [
    i as unknown as StringSelectMenuInteraction,
  ];
  const modal = (
    i: ReturnType<typeof boardInteraction>,
  ): [ModalSubmitInteraction] => [i as unknown as ModalSubmitInteraction];
  let restoreBoardActor: (() => void) | undefined;
  afterEach(() => {
    restoreBoardActor?.();
    restoreBoardActor = undefined;
  });
  const boardPayload = (value: unknown) =>
    JSON.parse(JSON.stringify(value)) as {
      title: string;
      custom_id: string;
      embeds: { title: string; description: string }[];
      components: {
        components: { label: string; custom_id: string; max_length: number }[];
      }[];
    };
  const boardActions = () => {
    const spy = jest.spyOn(discord, 'actor').mockImplementation((identity) =>
      Promise.resolve({
        ...[owner, contributor, player, manager, admin].find(
          (a) => a.userId === identity.user.id,
        )!,
        guildId: identity.guildId!,
        channelId: identity.channelId!,
      }),
    );
    restoreBoardActor = () => spy.mockRestore();
    return new BingoBoardActionsController(
      store,
      discord,
      selections,
      new BingoRepliesService(discord),
    );
  };

  it('marks from a primary button through a private user-bound cell selector', async () => {
    const { board } = await game();
    const controls = new BingoInteractionController(
      store,
      discord,
      new BingoRepliesService(discord),
    );
    const open = boardInteraction(player, board.messageId!);
    await controls.markMenu(button(open), board.id);
    expect(open.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    const payload = JSON.parse(
      JSON.stringify(open.editReply.mock.calls[0][0]),
    ) as {
      components: {
        components: { custom_id: string; options: { value: string }[] }[];
      }[];
    };
    const menu = payload.components[0].components[0];
    expect(menu.custom_id.length).toBeLessThanOrEqual(100);
    expect(menu.options).toHaveLength(9);
    const stolen = boardInteraction(owner);
    await controls.markPick(
      selected(stolen),
      board.id,
      player.userId,
      board.messageId!,
      ['0'],
    );
    expect(JSON.stringify(stolen.followUp.mock.calls)).toContain(
      'another user',
    );
    expect((await store.active(owner)).game.cells[0].markedBy).toBeNull();
    const pick = boardInteraction(player);
    await controls.markPick(
      selected(pick),
      board.id,
      player.userId,
      board.messageId!,
      ['0'],
    );
    expect(pick.followUp).not.toHaveBeenCalled();
    expect(JSON.stringify(pick.editReply.mock.calls)).toContain('A1 is marked');
    expect((await store.active(owner)).game.cells[0].markedBy).toBe(
      player.userId,
    );
    const nextOpen = boardInteraction(player, board.messageId!);
    await controls.markMenu(button(nextOpen), board.id);
    expect(JSON.stringify(nextOpen.editReply.mock.calls)).not.toContain(
      '"value":"0"',
    );
    const published = JSON.parse(
      JSON.stringify(
        messages.get(board.messageId!)!.edit.mock.calls.at(-1)![0],
      ),
    ) as {
      components: {
        components: { label: string; style: number; disabled: boolean }[];
      }[];
    };
    expect(published.components[0].components[0]).toMatchObject({
      label: 'Mark a cell',
      style: 1,
      disabled: false,
    });
    await store.end(owner);
    const stale = boardInteraction(player);
    await controls.markPick(
      selected(stale),
      board.id,
      player.userId,
      board.messageId!,
      ['1'],
    );
    expect(JSON.stringify(stale.followUp.mock.calls)).toContain(
      'no longer active',
    );
  });

  selectionTest(
    'adds and browses phrases from board buttons without changing its snapshot',
    async () => {
      const { set, board } = await game();
      const actions = boardActions();
      const open = boardInteraction(contributor, board.messageId!);
      await actions.addPhrase(button(open), board.id);
      expect(open.deferReply).not.toHaveBeenCalled();
      const form = boardPayload(open.showModal.mock.calls[0][0]);
      expect(form.title).toBe('Add phrase');
      expect(form.custom_id.length).toBeLessThanOrEqual(100);
      expect(form.components[0].components[0].max_length).toBe(80);
      const submit = boardInteraction(contributor);
      await actions.savePhrase(modal(submit), board.id, board.messageId!);
      expect(JSON.stringify(submit.editReply.mock.calls)).toContain(
        'Phrase added',
      );
      expect((await store.show(owner, set.id)).total).toBe(26);
      expect((await store.active(owner)).game.cells).toEqual(board.cells);
      const browse = boardInteraction(player, board.messageId!);
      await actions.phrases(button(browse), board.id);
      const data = boardPayload(browse.editReply.mock.calls[0][0]);
      expect(data.embeds[0].title).toBe('Raid Bingo');
      expect(data.embeds[0].description).toContain('26 phrase(s)');
      expect(JSON.stringify(data.embeds)).not.toContain(set.id);
      const published = boardPayload(send.mock.calls[0][0]);
      const buttons = published.components.flatMap(
        (row: { components: { label: string; custom_id: string }[] }) =>
          row.components,
      );
      expect(buttons.map((b: { label: string }) => b.label)).toEqual([
        'Mark a cell',
        'Unmark a cell',
        'Add phrase',
        'Phrases',
      ]);
      for (const row of published.components) {
        expect(row.components.length).toBeLessThanOrEqual(3);
        for (const control of row.components)
          expect(control.custom_id.length).toBeLessThanOrEqual(100);
      }
    },
  );

  selectionTest(
    'keeps legacy lifecycle interactions safe on previously posted boards',
    async () => {
      const { set, board } = await game();
      const actions = boardActions();
      const request = boardInteraction(owner, board.messageId!);
      await actions.endGame(button(request), board.id);
      expect((await store.active(owner)).game.id).toBe(board.id);
      const prompt = boardPayload(request.editReply.mock.calls[0][0]);
      expect(
        prompt.components[0].components[0].custom_id.length,
      ).toBeLessThanOrEqual(100);
      const cancel = boardInteraction();
      await actions.cancelEnd(button(cancel), owner.userId);
      expect((await store.active(owner)).game.id).toBe(board.id);
      const confirm = boardInteraction();
      await actions.confirmEnd(
        button(confirm),
        board.id,
        owner.userId,
        board.messageId!,
      );
      expect(confirm.followUp).not.toHaveBeenCalled();
      expect(
        (await db.getRepository(BingoGame).findOneByOrFail({ id: board.id }))
          .endedAt,
      ).not.toBeNull();
      const newGame = boardInteraction(owner, board.messageId!);
      await actions.newGame(button(newGame), board.id);
      expect(JSON.stringify(newGame.editReply.mock.calls)).toContain(
        'Choose a board size',
      );
      const size = boardInteraction();
      await actions.size(
        selected(size),
        board.id,
        owner.userId,
        board.messageId!,
        ['4'],
      );
      const picker = boardPayload(size.editReply.mock.calls[0][0]);
      const token = picker.components[0].components[0].custom_id.split('/')[2];
      await selections.choose(owner, token, set.id);
      const next = (await store.active(owner)).game;
      expect(next.size).toBe(4);
      expect(next.id).not.toBe(board.id);
      const stale = boardInteraction();
      await actions.confirmEnd(
        button(stale),
        board.id,
        owner.userId,
        board.messageId!,
      );
      expect(stale.followUp).toHaveBeenCalled();
      await expect(store.end(owner, board.id)).rejects.toThrow('already ended');
      expect((await store.active(owner)).game.id).toBe(next.id);
    },
  );

  selectionTest(
    'rechecks board form access, bindings, ownership and feature gates before mutations',
    async () => {
      const { set, board } = await game();
      const actions = boardActions();
      const denied = boardInteraction(player);
      await actions.savePhrase(modal(denied), board.id, board.messageId!);
      expect(JSON.stringify(denied.editReply.mock.calls)).toContain(
        'contributor',
      );
      const revoke = boardInteraction(contributor);
      await store.contributor(owner, set.id, contributor.userId, false);
      await actions.savePhrase(modal(revoke), board.id, board.messageId!);
      expect(JSON.stringify(revoke.editReply.mock.calls)).toContain(
        'contributor',
      );
      const wrongMessage = boardInteraction(contributor);
      await actions.savePhrase(modal(wrongMessage), board.id, 'old-message');
      expect(JSON.stringify(wrongMessage.editReply.mock.calls)).toContain(
        'no longer active',
      );
      const wrongChannel = boardInteraction(otherChannel);
      await actions.savePhrase(modal(wrongChannel), board.id, board.messageId!);
      expect(JSON.stringify(wrongChannel.editReply.mock.calls)).toContain(
        'no longer active',
      );
      const end = boardInteraction(player, board.messageId!);
      await actions.endGame(button(end), board.id);
      expect(JSON.stringify(end.editReply.mock.calls)).toContain(
        'Only the set owner',
      );
      const stolen = boardInteraction(player);
      await actions.confirmEnd(
        button(stolen),
        board.id,
        owner.userId,
        board.messageId!,
      );
      expect(JSON.stringify(stolen.followUp.mock.calls)).toContain(
        'another user',
      );
      await actions.size(
        selected(stolen),
        board.id,
        owner.userId,
        board.messageId!,
        ['3'],
      );
      expect(JSON.stringify(stolen.followUp.mock.calls)).toContain(
        'another user',
      );
      const invalid = boardInteraction();
      await actions.size(
        selected(invalid),
        board.id,
        owner.userId,
        board.messageId!,
        ['6'],
      );
      expect(JSON.stringify(invalid.followUp.mock.calls)).toContain(
        'valid board size',
      );
      await store.transfer(owner, set.id, contributor.userId);
      const formerOwner = boardInteraction();
      await actions.confirmEnd(
        button(formerOwner),
        board.id,
        owner.userId,
        board.messageId!,
      );
      expect(JSON.stringify(formerOwner.followUp.mock.calls)).toContain(
        'Only the set owner',
      );
      await db
        .getRepository(DiscordChannel)
        .update(
          { id: channelId },
          { features: { [DiscordChannelFeature.BINGO]: false } },
        );
      const disabled = boardInteraction(contributor);
      await actions.savePhrase(modal(disabled), board.id, board.messageId!);
      expect(JSON.stringify(disabled.editReply.mock.calls)).toContain(
        'not enabled',
      );
      expect(
        (await db.getRepository(BingoGame).findOneByOrFail({ id: board.id }))
          .endedAt,
      ).toBeNull();
      expect(
        await db.getRepository(BingoPhrase).countBy({ setId: set.id }),
      ).toBe(25);
    },
  );

  selectionTest(
    'runs all command groups through private selects without displaying identifiers',
    async () => {
      const replies = new BingoRepliesService(discord);
      const sets = new BingoSetController(store, replies, selections);
      const contributors = new BingoContributorController(replies, selections);
      const phrases = new BingoPhraseController(replies, selections);
      const games = new BingoGameController(
        store,
        discord,
        replies,
        selections,
      );
      const controls = new BingoInteractionController(store, discord, replies);
      const picker = new BingoSelectionController(selections, replies);
      const interaction = (actor = owner, messageId?: string) => {
        const i = {
          guildId: actor.guildId,
          channelId: actor.channelId,
          user: { id: actor.userId },
          message: { id: messageId ?? '' },
          deferred: false,
          replied: false,
          customId: 'bingo/pick/test',
          isChatInputCommand: () => !messageId,
          commandName: 'bingo',
          options: {
            getSubcommandGroup: () => 'test',
            getSubcommand: () => 'test',
          },
          deferReply: jest.fn<() => Promise<void>>().mockImplementation(() => {
            i.deferred = true;
            return Promise.resolve();
          }),
          deferUpdate: jest.fn<() => Promise<void>>().mockResolvedValue(),
          followUp: jest
            .fn<(payload: unknown) => Promise<void>>()
            .mockResolvedValue(),
          editReply: jest
            .fn<(payload: unknown) => Promise<void>>()
            .mockResolvedValue(),
          reply: jest.fn<() => Promise<void>>().mockResolvedValue(),
        };
        return i;
      };
      const slash = (actor = owner) =>
        [interaction(actor) as unknown as ChatInputCommandInteraction] as [
          ChatInputCommandInteraction,
        ];
      const payload = (context: [ChatInputCommandInteraction]): unknown =>
        (context[0].editReply as ReturnType<typeof jest.fn>).mock.calls.at(
          -1,
        )![0];
      const visible = (value: unknown) => {
        const data = JSON.parse(JSON.stringify(value)) as {
          content?: string;
          embeds?: unknown[];
          components?: {
            components: {
              label?: string;
              options?: { label: string; description?: string }[];
            }[];
          }[];
        };
        return JSON.stringify({
          content: data.content,
          embeds: data.embeds,
          labels: data.components?.flatMap((row) =>
            row.components.flatMap((component) => [
              component.label,
              ...(component.options ?? []).flatMap((o) => [
                o.label,
                o.description,
              ]),
            ]),
          ),
        });
      };
      const select = async (
        context: [ChatInputCommandInteraction],
        choice: string,
        actor = owner,
      ) => {
        const data = JSON.parse(JSON.stringify(payload(context))) as {
          components: { components: { custom_id: string }[] }[];
        };
        const token = data.components[0].components[0].custom_id.split('/')[2];
        const i = interaction(actor, 'selection-message');
        await picker.choose(
          [i as unknown as StringSelectMenuInteraction],
          token,
          [choice],
        );
        expect(i.followUp).not.toHaveBeenCalled();
        const value = i.editReply.mock.calls.at(-1)![0];
        expect(visible(value)).not.toMatch(
          /[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/i,
        );
        return [i as unknown as ChatInputCommandInteraction] as [
          ChatInputCommandInteraction,
        ];
      };
      const created = slash();
      await sets.create(created, { name: 'Complete workflow' });
      expect(visible(payload(created))).not.toContain('Set ID');
      const set = await db
        .getRepository(BingoSet)
        .findOneByOrFail({ name: 'Complete workflow' });
      const list = slash(player);
      await sets.list(list, { includeArchived: null });
      await select(list, set.id, player);
      const invited = slash();
      await contributors.add(invited, {
        user: { id: contributor.userId } as import('discord.js').GuildMember,
      });
      await select(invited, set.id);
      for (let n = 0; n < 10; n++) {
        const add = slash(contributor);
        await phrases.add(add, { text: `Workflow phrase ${n}` });
        await select(add, set.id, contributor);
      }
      const phrase = (await store.show(owner, set.id)).phrases[0];
      const edit = slash(contributor);
      await phrases.edit(edit, { text: 'A revised phrase' });
      const editPhrases = await select(edit, set.id, contributor);
      await select(editPhrases, phrase.id, contributor);
      const show = slash(player);
      await sets.show(show);
      const shown = await select(show, set.id, player);
      expect(visible(payload(shown))).toContain('10 phrase(s)');
      const remove = slash(contributor);
      await phrases.remove(remove);
      const removePhrases = await select(remove, set.id, contributor);
      await select(removePhrases, phrase.id, contributor);
      const start = slash();
      await games.start(start, { size: 3 });
      await select(start, set.id);
      const board = (await store.active(owner)).game;
      const mark = interaction(player, board.messageId!);
      await controls.mark(
        [mark as unknown as StringSelectMenuInteraction],
        board.id,
        ['0'],
      );
      expect(JSON.stringify(mark.editReply.mock.calls)).toContain(
        'A1 is marked',
      );
      const unmark = interaction(player, board.messageId!);
      await controls.unmark([unmark as unknown as ButtonInteraction], board.id);
      expect(JSON.stringify(unmark.editReply.mock.calls)).toContain(
        'Select a cell to unmark',
      );
      const undo = interaction(player, 'private-message');
      await controls.undo(
        [undo as unknown as StringSelectMenuInteraction],
        board.id,
        player.userId,
        board.messageId!,
        ['0'],
      );
      expect(JSON.stringify(undo.editReply.mock.calls)).toContain(
        'A1 is no longer marked',
      );
      const gameShow = slash(player);
      await games.show(gameShow);
      const end = slash();
      await games.end(end);
      const revoke = slash();
      await contributors.remove(revoke, {
        user: { id: contributor.userId } as import('discord.js').GuildMember,
      });
      await select(revoke, set.id);
      const archive = slash();
      await sets.archive(archive);
      await select(archive, set.id);
      const restore = slash();
      await sets.restore(restore);
      await select(restore, set.id);
      const transfer = slash();
      await sets.transfer(transfer, {
        user: { id: player.userId } as import('discord.js').GuildMember,
      });
      await select(transfer, set.id);
      expect((await store.show(player, set.id)).set.ownerId).toBe(
        player.userId,
      );
    },
  );

  selectionTest(
    'binds menus to their owner/channel, rechecks access, and prevents forged or repeated choices',
    async () => {
      const set = await ready(1);
      const tokenFrom = (reply: unknown) =>
        (
          JSON.parse(JSON.stringify(reply)) as {
            components: { components: { custom_id: string }[] }[];
          }
        ).components[0].components[0].custom_id.split('/')[2];
      const token = tokenFrom(
        await selections.open(contributor, 'phrase-add', {
          text: 'New phrase',
        }),
      );
      await expect(selections.choose(player, token, set.id)).rejects.toThrow(
        'another user',
      );
      await expect(
        selections.choose(
          { ...contributor, channelId: otherChannel.channelId },
          token,
          set.id,
        ),
      ).rejects.toThrow('another user');
      await expect(
        selections.choose(
          contributor,
          token,
          '00000000-0000-4000-8000-000000000001',
        ),
      ).rejects.toThrow('from this menu');
      await store.contributor(owner, set.id, contributor.userId, false);
      await expect(
        selections.choose(contributor, token, set.id),
      ).rejects.toThrow('invited');
      const good = tokenFrom(
        await selections.open(owner, 'phrase-add', { text: 'Saved once' }),
      );
      await selections.choose(owner, good, set.id);
      await expect(selections.choose(owner, good, set.id)).rejects.toThrow(
        'expired',
      );
      const expired = tokenFrom(await selections.open(owner, 'show'));
      await redis!.del(`bingo:selection:${expired}`);
      await expect(selections.choose(owner, expired, set.id)).rejects.toThrow(
        'expired',
      );
    },
  );

  selectionTest(
    'paginates named sets and phrases beyond 25 choices and filters phrases by author',
    async () => {
      const set = await ready(30);
      const tokenFrom = (reply: unknown) =>
        (
          JSON.parse(JSON.stringify(reply)) as {
            components: { components: { custom_id: string }[] }[];
          }
        ).components[0].components[0].custom_id.split('/')[2];
      const optionsFrom = (reply: unknown) =>
        (
          JSON.parse(JSON.stringify(reply)) as {
            components: {
              components: { options: { label: string; value: string }[] }[];
            }[];
          }
        ).components[0].components[0].options;
      const opened = await selections.open(contributor, 'phrase-edit', {
        text: 'Updated',
      });
      const token = tokenFrom(opened);
      const first = await selections.choose(contributor, token, set.id);
      expect(optionsFrom(first)).toHaveLength(25);
      const second = await selections.page(contributor, token, '2');
      expect(optionsFrom(second)).toHaveLength(5);
      expect(
        optionsFrom(second).every((item) => !item.label.includes(item.value)),
      ).toBe(true);
      await selections.cancel(contributor, token);
      await expect(selections.page(contributor, token, '1')).rejects.toThrow(
        'expired',
      );
      await store.contributor(owner, set.id, player.userId, true);
      await store.phrase(player, set.id, 'add', 'Own phrase');
      expect(
        (await store.selectionItems(player, 'phrase-edit', 1, set.id, true))
          .items,
      ).toHaveLength(1);
      for (let i = 0; i < 26; i++) await store.create(owner, `Set ${i}`);
      const sets = await selections.open(owner, 'show');
      expect(optionsFrom(sets)).toHaveLength(25);
      expect(
        optionsFrom(await selections.page(owner, tokenFrom(sets), '2')),
      ).toHaveLength(2);
    },
  );

  it('reverses and reapplies the bingo migration without removing other feature configuration', async () => {
    await ready(1);
    await db.undoLastMigration();
    const rows: { features: string[] }[] = await db.query(
      'SELECT features FROM discord_guilds',
    );
    expect(rows.every((row) => !row.features.includes('bingo'))).toBe(true);
    await db.runMigrations();
    expect(await db.getRepository(BingoSet).count()).toBe(0);
    expect(await db.getRepository(BingoPhrase).count()).toBe(0);
  });
});
