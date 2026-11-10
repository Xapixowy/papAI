import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WowMonitorState } from '@Database/entities/wow-monitor-state.entity';
import { WowNotification } from '@Database/entities/wow-notification.entity';
import { WowHealthState } from '@Types/wow/wow.type';

export function initialHealth<T>(): WowHealthState<T> {
  return { snapshot: null, failures: 0, unavailable: false, version: 0 };
}

@Injectable()
export class WowStoreService {
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
    >,
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
}
