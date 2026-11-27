import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, IsNull, Like, Not } from 'typeorm';
import { createHash } from 'node:crypto';
import type { APIEmbed } from 'discord.js';
import { WowMonitorState } from '@Database/entities/wow-monitor-state.entity';
import { WowNotification } from '@Database/entities/wow-notification.entity';
import { WowHealthState, WowSourceError } from '@Types/wow/wow.type';
import {
  WowPatchView,
  patchViewKey,
  patchNotificationKey,
  patchNotificationToken,
} from '@Types/wow/wow-patch-notes.type';

export function initialHealth<T>(): WowHealthState<T> {
  return { snapshot: null, failures: 0, unavailable: false, version: 0 };
}

@Injectable()
export class WowStoreService {
  private readonly logger = new Logger(WowStoreService.name);
  constructor(private readonly dataSource: DataSource) {}

  async state<T extends object>(
    key: string,
    initial: T,
    mutate: (state: T, manager: EntityManager) => Promise<void>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [key],
      );
      const repository = manager.getRepository(WowMonitorState);
      const row = await repository.findOneBy({ key });
      const state = row ? (row.data as T) : structuredClone(initial);
      await mutate(state, manager);
      await repository.save({ key, data: state });
      return state;
    });
  }

  async queue(
    manager: EntityManager,
    notification: Pick<
      WowNotification,
      'eventKey' | 'guildId' | 'channelId' | 'kind' | 'characterSlug' | 'embeds'
    > &
      Partial<Pick<WowNotification, 'createdAt' | 'patchSummaryInput'>>,
  ): Promise<void> {
    await manager
      .getRepository(WowNotification)
      .createQueryBuilder()
      .insert()
      .values({
        eventKey: notification.eventKey,
        guildId: notification.guildId,
        channelId: notification.channelId,
        kind: notification.kind,
        characterSlug: notification.characterSlug,
        embeds: notification.embeds,
        createdAt: notification.createdAt,
        patchSummaryInput: notification.patchSummaryInput,
      })
      .orIgnore()
      .execute();
  }

  async lock(name: string, run: () => Promise<void>): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    let locked = false;
    try {
      const rows = (await runner.query(
        'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked',
        [name],
      )) as { locked: boolean }[];
      locked = rows[0]?.locked === true;
      if (locked) await run();
      else
        this.logger.log(
          `Skipping WoW scheduled task ${name}: another run holds the lock.`,
        );
    } finally {
      try {
        if (locked)
          await runner.query(
            'SELECT pg_advisory_unlock(hashtextextended($1, 0))',
            [name],
          );
      } finally {
        await runner.release();
      }
    }
  }

  async savePatchView(
    manager: EntityManager,
    guildId: string,
    channelId: string,
    pages: APIEmbed[],
  ): Promise<string> {
    const token = createHash('sha256')
      .update(
        JSON.stringify({
          guildId,
          channelId,
          pages: pages.map((page) => ({ ...page, timestamp: undefined })),
        }),
      )
      .digest('hex');
    await manager
      .getRepository(WowMonitorState)
      .createQueryBuilder()
      .insert()
      .values({ key: patchViewKey(token), data: { guildId, channelId, pages } })
      .orIgnore()
      .execute();
    return token;
  }

  async patchView(
    token: string,
    guildId: string,
    channelId: string,
  ): Promise<APIEmbed[]> {
    const row = /^[a-f0-9]{64}$/.test(token)
      ? await this.dataSource
          .getRepository(WowMonitorState)
          .findOneBy({ key: patchViewKey(token) })
      : null;
    const data = row?.data as Partial<WowPatchView> | undefined;
    if (
      !data ||
      data.guildId !== guildId ||
      data.channelId !== channelId ||
      !Array.isArray(data.pages) ||
      data.pages.length < 2
    )
      throw new WowSourceError(
        'These patch notes are not available in this channel. Use Source to read the original article.',
      );
    return data.pages;
  }

  /** Fold retained legacy parts into one summary, preserving their full snapshot. */
  async preparePatchNotification(
    notification: WowNotification,
  ): Promise<WowNotification> {
    if (patchNotificationToken(notification.eventKey)) return notification;
    const base = /^(patch:.+):\d+$/.exec(notification.eventKey)?.[1];
    if (!base) throw new Error('Invalid legacy patch notification key');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(WowNotification);
      const scope = {
        kind: 'patch' as const,
        guildId: notification.guildId,
        channelId: notification.channelId,
        eventKey: Like(base + ':%'),
      };
      const parts = await repository.findBy(scope);
      parts.sort(
        (a, b) =>
          Number(a.eventKey.split(':').at(-1)) -
          Number(b.eventKey.split(':').at(-1)),
      );
      if (
        parts.some(
          (part, index) => Number(part.eventKey.split(':').at(-1)) !== index,
        )
      )
        throw new Error('Legacy patch notification is missing retained parts');
      const pages = parts.flatMap((part) => part.embeds);
      const summary = pages.at(-1);
      if (pages.length < 2 || !summary?.title?.includes('AI summary'))
        throw new Error(
          'Legacy patch notification does not contain its complete summary',
        );
      const url = pages.find((page) => page.url)?.url;
      const restored = pages.map((page) => ({ ...page, url: page.url ?? url }));
      const token = await this.savePatchView(
        manager,
        notification.guildId,
        notification.channelId,
        restored,
      );
      const embeds = [restored.at(-1)!];
      const eventKey = patchNotificationKey(token);
      await repository.update(notification.id, { embeds, eventKey });
      await repository.delete({
        ...scope,
        id: Not(notification.id),
        sentAt: IsNull(),
      });
      return { ...notification, embeds, eventKey };
    });
  }
}
