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
import { BingoInteractionController } from '@Controllers/discord/bingo/bingo-interaction.controller';
import type {
  Guild,
  StringSelectMenuInteraction,
  ButtonInteraction,
} from 'discord.js';

const url = process.env.BINGO_TEST_POSTGRES_URL;
const integration = url ? describe : describe.skip;

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
    expect(await store.suggestions(foreign, '')).toEqual([]);
    for (const action of [
      () => store.show(foreign, set.id),
      () => store.archive(foreign, set.id, true),
      () => store.phrase(foreign, set.id, 'add', 'Foreign'),
      () => store.suggestions(foreign, '', set.id),
    ])
      await expect(action()).rejects.toThrow('not found');
    expect((await store.suggestions(player, 'Raid'))[0].value).toBe(set.id);
    expect(
      (await store.suggestions(player, 'Phrase', set.id))[0].value,
    ).toBeDefined();
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

  it('announces only the first bingo, survives undo and keeps ended boards inactive', async () => {
    const { board } = await game();
    for (let i = 0; i < 3; i++)
      await store.mark(player, board.id, board.messageId!, i);
    await Promise.all([discord.publish(board.id), discord.publish(board.id)]);
    expect(send).toHaveBeenCalledTimes(2);
    await store.mark(player, board.id, board.messageId!, 0, true);
    await store.mark(player, board.id, board.messageId!, 0);
    await discord.publish(board.id);
    expect(send).toHaveBeenCalledTimes(2);
    const ended = await store.end(manager);
    await discord.publish(ended.id);
    await expect(
      store.mark(player, board.id, board.messageId!, 3),
    ).rejects.toThrow('no longer active');
    expect(
      JSON.stringify(messages.get(board.messageId!)!.edit.mock.calls.at(-1)),
    ).toContain('"disabled":true');
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
      discord,
      new BingoRepliesService(discord),
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
        discord,
        new BingoRepliesService(discord),
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

  it('runs all command groups and mark/unmark controls through real handlers', async () => {
    const replies = new BingoRepliesService(discord);
    const sets = new BingoSetController(store, discord, replies);
    const contributors = new BingoContributorController(
      store,
      discord,
      replies,
    );
    const phrases = new BingoPhraseController(store, replies);
    const games = new BingoGameController(store, discord, replies);
    const controls = new BingoInteractionController(store, discord, replies);
    const interaction = (actor = owner, messageId?: string) => {
      const i = {
        guildId: actor.guildId,
        channelId: actor.channelId,
        user: { id: actor.userId },
        message: { id: messageId ?? '' },
        deferred: false,
        replied: false,
        customId: 'bingo/test',
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
    const check = (context: [ChatInputCommandInteraction]) =>
      expect(
        JSON.stringify(
          (context[0].editReply as ReturnType<typeof jest.fn>).mock.calls,
        ),
      ).not.toMatch(/could not|Only the|not found/);
    const created = slash();
    await sets.create(created, { name: 'Complete workflow' });
    check(created);
    const set = await db
      .getRepository(BingoSet)
      .findOneByOrFail({ name: 'Complete workflow' });
    const selected = { set: set.id };
    const list = slash(player);
    await sets.list(list, { page: null, includeArchived: null });
    check(list);
    const addContributor = slash();
    await contributors.add(addContributor, {
      ...selected,
      user: { id: contributor.userId } as import('discord.js').GuildMember,
    });
    check(addContributor);
    for (let n = 0; n < 10; n++) {
      const add = slash(contributor);
      await phrases.add(add, { ...selected, text: `Workflow phrase ${n}` });
      check(add);
    }
    const phrase = (await store.show(owner, set.id)).phrases[0];
    const edit = slash(contributor);
    await phrases.edit(edit, {
      ...selected,
      phrase: phrase.id,
      text: 'A revised phrase',
    });
    check(edit);
    const show = slash(player);
    await sets.show(show, { ...selected, page: null });
    check(show);
    expect(
      JSON.stringify(
        (show[0].editReply as ReturnType<typeof jest.fn>).mock.calls,
      ),
    ).toContain('10 phrase(s)');
    const remove = slash(contributor);
    await phrases.remove(remove, { ...selected, phrase: phrase.id });
    check(remove);
    const start = slash();
    await games.start(start, { ...selected, size: 3 });
    check(start);
    const board = (await store.active(owner)).game;
    const mark = interaction(player, board.messageId!);
    await controls.mark(
      [mark as unknown as StringSelectMenuInteraction],
      board.id,
      ['0'],
    );
    expect(JSON.stringify(mark.editReply.mock.calls)).toContain('A1 is marked');
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
    check(gameShow);
    const end = slash();
    await games.end(end);
    check(end);
    const revoke = slash();
    await contributors.remove(revoke, {
      ...selected,
      user: { id: contributor.userId } as import('discord.js').GuildMember,
    });
    check(revoke);
    const archive = slash();
    await sets.archive(archive, selected);
    check(archive);
    const restore = slash();
    await sets.restore(restore, selected);
    check(restore);
    const transfer = slash();
    await sets.transfer(transfer, {
      ...selected,
      user: { id: player.userId } as import('discord.js').GuildMember,
    });
    check(transfer);
    expect((await store.show(player, set.id)).set.ownerId).toBe(player.userId);
  });

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
