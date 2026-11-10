import {
  describe,
  it,
  expect,
  jest,
  beforeAll,
  beforeEach,
  afterAll,
} from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client, TextChannel } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DataSource, IsNull } from 'typeorm';
import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { DiscordChannel } from '@Database/entities/discord-channel.entity';
import { DiscordUser } from '@Database/entities/discord-user.entity';
import { WowObserver } from '@Database/entities/wow-observer.entity';
import { WowNotification } from '@Database/entities/wow-notification.entity';
import { WowMonitorState } from '@Database/entities/wow-monitor-state.entity';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import {
  WowCharacter,
  WowForumSnapshot,
  WowHealthState,
} from '@Types/wow/wow.type';
import { parseCharacterHtml, parseRealmStatus } from '@Services/wow/wow-parser';
import { WowSourceService } from '@Services/wow/wow-source.service';
import { WowForumService } from '@Services/wow/wow-forum.service';
import { WowEmbedService } from '@Services/wow/wow-embed.service';
import { WowStoreService } from '@Services/wow/wow-store.service';
import { WowMonitorService } from '@Services/wow/wow-monitor.service';
import { WowCommandsService } from '@Services/wow/wow-commands.service';

const url = process.env.WOW_TEST_POSTGRES_URL;
const integration = url ? describe : describe.skip;

integration(
  'WoW workflows with PostgreSQL and a simulated Discord transport',
  () => {
    const guildId = '100000000000000001';
    const otherGuildId = '100000000000000002';
    const channelId = '110000000000000001';
    const userId = '120000000000000001';
    const adminId = '120000000000000002';
    let db: DataSource;
    let commands: WowCommandsService;
    let source: WowSourceService;
    let forum: WowForumService;
    let monitor: WowMonitorService;
    let client: Client;
    let embeds: WowEmbedService;
    let characterRead: jest.SpiedFunction<WowSourceService['character']>;
    let realmRead: jest.SpiedFunction<WowSourceService['realms']>;
    let forumRead: jest.SpiedFunction<WowForumService['read']>;
    let current: WowCharacter;
    let currentRealms: ReturnType<typeof parseRealmStatus>;
    const send = jest
      .fn<(options: unknown) => Promise<object>>()
      .mockResolvedValue({});

    const newMonitor = () =>
      new WowMonitorService(
        db,
        new WowStoreService(db),
        source,
        forum,
        embeds,
        client,
      );
    beforeAll(async () => {
      const target = new URL(url!);
      if (
        !['127.0.0.1', 'localhost'].includes(target.hostname) ||
        target.pathname !== '/pap_ai_wow_test'
      )
        throw new Error(
          'Integration tests require the dedicated local pap_ai_wow_test database',
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
      client = new Client({ intents: [] });
      jest.spyOn(client, 'isReady').mockReturnValue(true);
      const channel = {
        id: channelId,
        guildId,
        name: 'wow-tests',
        isTextBased: () => true,
        isSendable: () => true,
        isThread: () => false,
        guild: {
          members: {
            fetchMe: () => Promise.resolve({}),
            fetch: () => Promise.resolve({}),
          },
        },
        permissionsFor: () => ({ has: () => true }),
        send,
      };
      jest
        .spyOn(client.channels, 'fetch')
        .mockResolvedValue(channel as unknown as TextChannel);
      const config = new ConfigService({
        discord: {
          colors: {
            info: '#3498db',
            warning: '#f1c40f',
            success: '#2ecc71',
            error: '#e74c3c',
          },
          botName: 'Test bot',
        },
        app: { version: 'test' },
      });
      embeds = new WowEmbedService(client, config);
      source = new WowSourceService(new HttpService());
      forum = new WowForumService(new HttpService());
      characterRead = jest
        .spyOn(source, 'character')
        .mockImplementation(() => Promise.resolve(structuredClone(current)));
      realmRead = jest
        .spyOn(source, 'realms')
        .mockImplementation(() =>
          Promise.resolve(structuredClone(currentRealms)),
        );
      forumRead = jest
        .spyOn(forum, 'read')
        .mockImplementation(() =>
          Promise.resolve({ posts: [], checkedAt: new Date().toISOString() }),
        );
      commands = new WowCommandsService(
        db,
        source,
        forum,
        new WowStoreService(db),
        embeds,
        client,
      );
    }, 30_000);

    beforeEach(async () => {
      jest.clearAllMocks();
      send.mockResolvedValue({});
      await db.query(
        'TRUNCATE wow_notifications, wow_monitor_states, wow_status_watches, wow_observers, discord_guilds, discord_channels, discord_users CASCADE',
      );
      await db.getRepository(DiscordGuild).save([
        {
          id: guildId,
          name: 'Test guild',
          features: [DiscordFeature.WOW_FOREVER],
          channelFeatureDefaults: {},
        },
        {
          id: otherGuildId,
          name: 'Other guild',
          features: [DiscordFeature.WOW_FOREVER],
          channelFeatureDefaults: {},
        },
      ]);
      await db.getRepository(DiscordUser).save({
        id: adminId,
        username: 'Admin',
        roles: [DiscordUserRole.ADMIN],
      });
      await db.getRepository(DiscordChannel).save({
        id: channelId,
        discordGuildId: guildId,
        name: 'wow-tests',
        features: { [DiscordChannelFeature.WOW_FOREVER]: true },
      });
      const fixture = readFileSync(
        join(__dirname, '__fixtures__/character.json'),
        'utf8',
      );
      current = parseCharacterHtml(
        `<script id="character-profile-mount-initial-state">var characterProfileInitialState = ${fixture};</script>`,
        'judgement-judy',
      );
      currentRealms = parseRealmStatus(
        JSON.parse(
          readFileSync(join(__dirname, '__fixtures__/realms.json'), 'utf8'),
        ),
      );
      characterRead.mockImplementation(() =>
        Promise.resolve(structuredClone(current)),
      );
      realmRead.mockImplementation(() =>
        Promise.resolve(structuredClone(currentRealms)),
      );
      forumRead.mockImplementation(() =>
        Promise.resolve({ posts: [], checkedAt: new Date().toISOString() }),
      );
      monitor = newMonitor();
    });

    afterAll(async () => {
      await client?.destroy();
      if (db?.isInitialized) await db.destroy();
    });

    it('baselines silently, keeps a manual read independent, and sends one level change per channel for two subscribers', async () => {
      await commands.add(guildId, userId, channelId, current.slug);
      await commands.add(
        guildId,
        '120000000000000003',
        channelId,
        current.slug,
      );
      await monitor.pollCharacters();
      expect(send).not.toHaveBeenCalled();
      current.level = 28;
      current.sourceUpdatedAt = new Date().toISOString();
      await commands.character(current.slug);
      expect(send).not.toHaveBeenCalled();
      await monitor.pollCharacters();
      expect(send).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(send.mock.calls[0][0])).toContain('25 → 28');
      await newMonitor().pollCharacters();
      expect(send).toHaveBeenCalledTimes(1);
      expect(characterRead).toHaveBeenCalledTimes(6); // add twice, three polls, one manual read
    });

    it('retries a durable notification after transport failure and a new service instance', async () => {
      await commands.add(guildId, userId, channelId, current.slug);
      current.guild = null;
      current.sourceUpdatedAt = new Date().toISOString();
      send.mockRejectedValueOnce(new Error('Discord unavailable'));
      await monitor.pollCharacters();
      const pending = await db
        .getRepository(WowNotification)
        .findOneByOrFail({ sentAt: IsNull() });
      expect(pending.attempts).toBe(1);
      await db
        .getRepository(WowNotification)
        .update(pending.id, { nextAttemptAt: new Date(Date.now() - 1000) });
      await newMonitor().dispatch();
      expect(send).toHaveBeenCalledTimes(2);
      expect(
        (
          await db
            .getRepository(WowNotification)
            .findOneByOrFail({ id: pending.id })
        ).sentAt,
      ).not.toBeNull();
      expect(JSON.stringify(send.mock.calls[1][0])).toContain(
        'Circle of Lore → brak',
      );
    });

    it('warns once after three source failures, preserves the baseline and announces recovery', async () => {
      await commands.add(guildId, userId, channelId, current.slug);
      characterRead.mockRejectedValue(new Error('Armory down'));
      for (let i = 0; i < 4; i++) await monitor.pollCharacters();
      expect(send).toHaveBeenCalledTimes(1);
      const row = await db.getRepository(WowMonitorState).findOneByOrFail({
        key: `character:${guildId}:${channelId}:${current.slug}`,
      });
      expect((row.data as WowHealthState<WowCharacter>).snapshot?.level).toBe(
        25,
      );
      characterRead.mockResolvedValue(current);
      await newMonitor().pollCharacters();
      expect(send).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(send.mock.calls[1][0])).toContain('wznowiony');
    });

    it('scopes regular/admin lists and removals to the current guild and enforces configuration roles', async () => {
      await commands.add(guildId, userId, channelId, current.slug);
      const observation = await db
        .getRepository(WowObserver)
        .findOneByOrFail({ guildId });
      await expect(
        commands.remove(guildId, 'outsider', observation.id),
      ).rejects.toThrow();
      await expect(
        commands.remove(otherGuildId, adminId, observation.id),
      ).rejects.toThrow();
      expect(
        JSON.stringify(
          (await commands.list(otherGuildId, adminId)).map((e) => e.toJSON()),
        ),
      ).not.toContain(observation.id);
      await expect(
        commands.allowChannel(guildId, userId, channelId, false),
      ).rejects.toThrow();
      await commands.remove(guildId, adminId, observation.id);
      expect(await db.getRepository(WowObserver).count()).toBe(0);
    });

    it('respects disabled channels and starts a re-added observation without old backlog', async () => {
      await commands.add(guildId, userId, channelId, current.slug);
      await commands.allowChannel(guildId, adminId, channelId, false);
      current.level = 26;
      await monitor.pollCharacters();
      expect(send).not.toHaveBeenCalled();
      await expect(
        commands.add(guildId, userId, channelId, current.slug),
      ).rejects.toThrow();
      await commands.allowChannel(guildId, adminId, channelId, true);
      const observation = await db
        .getRepository(WowObserver)
        .findOneByOrFail({ guildId });
      await commands.remove(guildId, userId, observation.id);
      await commands.add(guildId, userId, channelId, current.slug);
      await monitor.pollCharacters();
      expect(send).not.toHaveBeenCalled();
    });

    it('handles realm transitions and ignores private status commands when creating alerts', async () => {
      await commands.setStatusChannel(guildId, adminId, channelId);
      await monitor.pollStatus();
      expect(send).not.toHaveBeenCalled();
      currentRealms[0].online = false;
      await commands.status(guildId);
      expect(send).not.toHaveBeenCalled();
      await monitor.pollStatus();
      expect(send).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(send.mock.calls[0][0])).toContain('offline');
      await commands.disableStatus(guildId, adminId);
      currentRealms[0].online = true;
      await monitor.pollStatus();
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('separates community login reports from all-online realms', async () => {
      await commands.setStatusChannel(guildId, adminId, channelId);
      const now = Date.now() + 1000;
      const snapshot: WowForumSnapshot = {
        checkedAt: new Date(now + 1000).toISOString(),
        posts: [1, 2, 3].map((n) => ({
          id: n,
          authorId: n,
          topicId: 42,
          createdAt: new Date(now).toISOString(),
          title: 'Cannot log in EU',
          text: 'Cannot log in EU',
          url: 'https://eu.forums.blizzard.com/en/wow/t/42',
          staff: false,
        })),
      };
      forumRead.mockResolvedValue(snapshot);
      await monitor.pollStatus();
      expect(send).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(send.mock.calls[0][0])).toContain(
        'Niepotwierdzony',
      );
      await monitor.pollStatus();
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('reverses and reapplies the migration with configured data', async () => {
      await commands.add(guildId, userId, channelId, current.slug);
      await db.undoLastMigration();
      const rows: { features: string[] }[] = await db.query(
        'SELECT features FROM discord_guilds',
      );
      expect(rows.every((r) => !r.features.includes('wow_forever'))).toBe(true);
      await db.runMigrations();
      expect(await db.getRepository(WowObserver).count()).toBe(0);
    });
  },
);
