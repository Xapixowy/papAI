import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
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
import {
  bingoId,
  bingoLabel,
  bingoText,
  completedLines,
  drawPhrases,
  normalizePhrase,
  requireBingo,
} from './bingo-rules';

export interface BingoActor {
  guildId: string;
  channelId: string;
  userId: string;
  manageChannels: boolean;
  administrator: boolean;
}

@Injectable()
export class BingoStoreService {
  constructor(private readonly db: DataSource) {}

  async gate(
    actor: BingoActor,
    manager = this.db.manager,
    channel = false,
  ): Promise<void> {
    const guild = await manager
      .getRepository(DiscordGuild)
      .findOneBy({ id: actor.guildId });
    requireBingo(
      guild?.features.includes(DiscordFeature.BINGO),
      'Bingo is not enabled on this server. Ask a bot administrator to enable it.',
    );
    if (channel) {
      const row = await manager
        .getRepository(DiscordChannel)
        .findOneBy({ id: actor.channelId, discordGuildId: actor.guildId });
      requireBingo(
        row?.features[DiscordChannelFeature.BINGO],
        'Bingo is not enabled on this channel. Ask a bot administrator to enable it.',
      );
    }
  }

  async create(actor: BingoActor, name: string): Promise<BingoSet> {
    await this.gate(actor);
    return this.db.getRepository(BingoSet).save({
      guildId: actor.guildId,
      ownerId: actor.userId,
      name: bingoText(name, 'Set name'),
      archived: false,
    });
  }

  async list(
    actor: BingoActor,
    page: number,
    archived = false,
  ): Promise<[BingoSet[], number]> {
    await this.gate(actor);
    return this.db.getRepository(BingoSet).findAndCount({
      where: archived
        ? { guildId: actor.guildId }
        : { guildId: actor.guildId, archived: false },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: 10,
      skip: this.offset(page),
    });
  }

  async show(
    actor: BingoActor,
    setId: string,
    page = 1,
  ): Promise<{
    set: BingoSet;
    phrases: BingoPhrase[];
    total: number;
    contributors: number;
  }> {
    await this.gate(actor);
    const set = await this.findSet(this.db.manager, actor, setId);
    const [phrases, total] = await this.db
      .getRepository(BingoPhrase)
      .findAndCount({
        where: { setId: set.id },
        order: { createdAt: 'ASC', id: 'ASC' },
        take: 10,
        skip: this.offset(page),
      });
    const contributors = await this.db
      .getRepository(BingoContributor)
      .countBy({ setId: set.id });
    return { set, phrases, total, contributors };
  }

  async archive(
    actor: BingoActor,
    setId: string,
    archived: boolean,
  ): Promise<void> {
    await this.editSet(actor, setId, async (set, manager) => {
      this.owner(set, actor, true);
      set.archived = archived;
      await manager.getRepository(BingoSet).save(set);
    });
  }

  async transfer(
    actor: BingoActor,
    setId: string,
    userId: string,
  ): Promise<void> {
    await this.editSet(actor, setId, async (set, manager) => {
      this.owner(set, actor, true);
      set.ownerId = userId;
      await manager.getRepository(BingoSet).save(set);
      await manager
        .getRepository(BingoContributor)
        .delete({ setId: set.id, userId });
    });
  }

  async contributor(
    actor: BingoActor,
    setId: string,
    userId: string,
    add: boolean,
  ): Promise<void> {
    await this.editSet(actor, setId, async (set, manager) => {
      this.owner(set, actor);
      requireBingo(
        !set.archived,
        'Restore this set before changing contributors.',
      );
      requireBingo(
        userId !== set.ownerId,
        'The owner already has full access to this set.',
      );
      const repo = manager.getRepository(BingoContributor);
      if (add)
        await repo.upsert({ setId: set.id, userId }, ['setId', 'userId']);
      else await repo.delete({ setId: set.id, userId });
    });
  }

  async phrase(
    actor: BingoActor,
    setId: string,
    operation: 'add' | 'edit' | 'remove',
    text?: string,
    phraseId?: string,
  ): Promise<BingoPhrase | undefined> {
    return this.editSet(actor, setId, async (set, manager) => {
      requireBingo(
        !set.archived,
        'Restore this set before changing its phrases.',
      );
      const isOwner = set.ownerId === actor.userId;
      const contributor = await manager
        .getRepository(BingoContributor)
        .existsBy({ setId: set.id, userId: actor.userId });
      requireBingo(
        isOwner || contributor,
        'Only the owner and invited contributors can change phrases in this set.',
      );
      const repo = manager.getRepository(BingoPhrase);
      let phrase: BingoPhrase;
      if (operation === 'add')
        phrase = repo.create({ setId: set.id, authorId: actor.userId });
      else {
        const existing = await repo.findOneBy({
          id: bingoId(phraseId ?? ''),
          setId: set.id,
        });
        requireBingo(existing, 'Phrase not found in this set.');
        requireBingo(
          isOwner || existing.authorId === actor.userId,
          'Contributors can edit or remove only their own phrases.',
        );
        phrase = existing;
      }
      if (operation === 'remove') {
        await repo.delete({ id: phrase.id, setId: set.id });
        return;
      }
      phrase.text = bingoText(text ?? '');
      phrase.normalized = normalizePhrase(phrase.text);
      const duplicate = await repo.findOneBy({
        setId: set.id,
        normalized: phrase.normalized,
      });
      requireBingo(
        !duplicate || duplicate.id === phrase.id,
        'This set already contains that phrase.',
      );
      return repo.save(phrase);
    });
  }

  async start(
    actor: BingoActor,
    setId: string,
    size: number,
  ): Promise<BingoGame> {
    requireBingo(
      [3, 4, 5].includes(size),
      'Choose a board size of 3, 4, or 5.',
    );
    return this.editSet(actor, setId, async (set, manager) => {
      await this.gate(actor, manager, true);
      this.gameManager(set, actor);
      requireBingo(
        !set.archived,
        'Archived sets cannot be used to start new games.',
      );
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`bingo:channel:${actor.guildId}:${actor.channelId}`],
      );
      const repo = manager.getRepository(BingoGame);
      requireBingo(
        !(await repo.existsBy({
          guildId: actor.guildId,
          channelId: actor.channelId,
          endedAt: IsNull(),
        })),
        'This channel already has an active game. End it before starting another.',
      );
      const phrases = await manager
        .getRepository(BingoPhrase)
        .findBy({ setId: set.id });
      return repo.save(
        repo.create({
          setId: set.id,
          setName: set.name,
          guildId: actor.guildId,
          channelId: actor.channelId,
          size,
          cells: drawPhrases(phrases, size * size).map((p) => ({
            phraseId: p.id,
            text: p.text,
            markedBy: null,
            markedAt: null,
          })),
          messageId: null,
          endedAt: null,
          bingoAt: null,
          announcedAt: null,
          revision: 1,
          syncedRevision: 0,
        }),
      );
    });
  }

  async active(
    actor: BingoActor,
  ): Promise<{ game: BingoGame; canManage: boolean }> {
    await this.gate(actor, this.db.manager, true);
    const game = await this.db.getRepository(BingoGame).findOneBy({
      guildId: actor.guildId,
      channelId: actor.channelId,
      endedAt: IsNull(),
    });
    requireBingo(game, 'There is no active bingo game on this channel.');
    const set = await this.findSet(this.db.manager, actor, game.setId);
    return {
      game,
      canManage: actor.manageChannels || set.ownerId === actor.userId,
    };
  }

  async board(
    actor: BingoActor,
    gameId: string,
    messageId: string,
  ): Promise<{ game: BingoGame; eligible: number[] }> {
    await this.gate(actor, this.db.manager, true);
    const game = await this.findGame(this.db.manager, actor, gameId, messageId);
    const set = await this.findSet(this.db.manager, actor, game.setId);
    return {
      game,
      eligible: game.cells.flatMap((cell, index) =>
        cell.markedBy &&
        (cell.markedBy === actor.userId ||
          actor.manageChannels ||
          set.ownerId === actor.userId)
          ? [index]
          : [],
      ),
    };
  }

  async mark(
    actor: BingoActor,
    gameId: string,
    messageId: string,
    index: number,
    undo = false,
  ): Promise<BingoGame> {
    return this.db.transaction(async (manager) => {
      await this.gate(actor, manager, true);
      const initial = await this.findGame(manager, actor, gameId, messageId);
      const set = await this.findSet(manager, actor, initial.setId, true);
      const game = await this.findGame(manager, actor, gameId, messageId, true);
      requireBingo(
        Number.isInteger(index) && index >= 0 && index < game.cells.length,
        'Choose a valid cell from this board.',
      );
      const cell = game.cells[index];
      if (undo) {
        requireBingo(cell.markedBy, 'This cell is not marked.');
        requireBingo(
          cell.markedBy === actor.userId ||
            set.ownerId === actor.userId ||
            actor.manageChannels,
          'Only the person who marked this cell, the set owner, or a channel manager can unmark it.',
        );
        cell.markedBy = null;
        cell.markedAt = null;
      } else {
        if (cell.markedBy) return game;
        cell.markedBy = actor.userId;
        cell.markedAt = new Date().toISOString();
      }
      if (!game.bingoAt && completedLines(game.cells, game.size).length)
        game.bingoAt = new Date();
      game.revision++;
      return manager.getRepository(BingoGame).save(game);
    });
  }

  async end(actor: BingoActor): Promise<BingoGame> {
    return this.db.transaction(async (manager) => {
      await this.gate(actor, manager, true);
      const initial = await manager.getRepository(BingoGame).findOneBy({
        guildId: actor.guildId,
        channelId: actor.channelId,
        endedAt: IsNull(),
      });
      requireBingo(initial, 'There is no active bingo game on this channel.');
      const set = await this.findSet(manager, actor, initial.setId, true);
      this.gameManager(set, actor);
      const game = await manager.getRepository(BingoGame).findOne({
        where: {
          id: initial.id,
          guildId: actor.guildId,
          channelId: actor.channelId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      requireBingo(game && !game.endedAt, 'This game has already ended.');
      game.endedAt = new Date();
      game.revision++;
      return manager.getRepository(BingoGame).save(game);
    });
  }

  async suggestions(
    actor: BingoActor,
    query: string,
    setId?: string,
  ): Promise<{ name: string; value: string }[]> {
    await this.gate(actor);
    if (setId) {
      const set = await this.findSet(this.db.manager, actor, setId);
      return (
        await this.db
          .getRepository(BingoPhrase)
          .createQueryBuilder('p')
          .where('p.set_id = :set', { set: set.id })
          .andWhere('(p.text ILIKE :q OR p.id::text ILIKE :q)', {
            q: `%${query.slice(0, 80)}%`,
          })
          .orderBy('p.created_at', 'ASC')
          .limit(25)
          .getMany()
      ).map((p) => ({
        name: `${bingoLabel(p.text, 60)} · ${p.id}`,
        value: p.id,
      }));
    }
    return (
      await this.db
        .getRepository(BingoSet)
        .createQueryBuilder('s')
        .where('s.guild_id = :guild', { guild: actor.guildId })
        .andWhere('(s.name ILIKE :q OR s.id::text ILIKE :q)', {
          q: `%${query.slice(0, 80)}%`,
        })
        .orderBy('s.archived', 'ASC')
        .addOrderBy('s.created_at', 'DESC')
        .limit(25)
        .getMany()
    ).map((s) => ({
      name: `${bingoLabel(`${s.archived ? '[Archived] ' : ''}${s.name}`, 60)} · ${s.id}`,
      value: s.id,
    }));
  }

  private async editSet<T>(
    actor: BingoActor,
    setId: string,
    action: (set: BingoSet, manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (manager) => {
      await this.gate(actor, manager);
      return action(await this.findSet(manager, actor, setId, true), manager);
    });
  }

  private async findSet(
    manager: EntityManager,
    actor: BingoActor,
    id: string,
    lock = false,
  ): Promise<BingoSet> {
    const set = await manager.getRepository(BingoSet).findOne({
      where: { id: bingoId(id), guildId: actor.guildId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    requireBingo(set, 'Bingo set not found on this server.');
    return set;
  }

  private async findGame(
    manager: EntityManager,
    actor: BingoActor,
    id: string,
    messageId: string,
    lock = false,
  ): Promise<BingoGame> {
    const game = await manager.getRepository(BingoGame).findOne({
      where: {
        id: bingoId(id),
        guildId: actor.guildId,
        channelId: actor.channelId,
      },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    requireBingo(
      game && !game.endedAt && game.messageId === messageId,
      'This board is no longer active. Use /bingo game show for the current board.',
    );
    return game;
  }

  private owner(
    set: BingoSet,
    actor: BingoActor,
    allowAdministrator = false,
  ): void {
    requireBingo(
      set.ownerId === actor.userId ||
        (allowAdministrator && actor.administrator),
      'Only the set owner can perform this action' +
        (allowAdministrator
          ? ', or a server administrator can recover access.'
          : '.'),
    );
  }

  private gameManager(set: BingoSet, actor: BingoActor): void {
    requireBingo(
      set.ownerId === actor.userId || actor.manageChannels,
      'Only the set owner or a user with Manage Channels can manage this game.',
    );
  }

  private offset(page: number): number {
    requireBingo(
      Number.isInteger(page) && page >= 1 && page <= 100000,
      'Choose a valid page number.',
    );
    return (page - 1) * 10;
  }
}
