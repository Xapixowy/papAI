import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  escapeMarkdown,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} from 'discord.js';
import type {
  GuildTextBasedChannel,
  MessageEditOptions,
  Message,
} from 'discord.js';
import { BingoGame } from '@Database/entities/bingo.entity';
import { BingoStoreService } from './bingo-store.service';
import type { BingoActor } from './bingo-store.service';
import { BingoRendererService } from './bingo-renderer.service';
import {
  bingoErrorDetails,
  bingoLabel,
  BingoError,
  cellLabel,
  requireBingo,
} from './bingo-rules';

export interface BingoIdentity {
  guildId: string | null;
  channelId: string;
  user: { id: string };
}

@Injectable()
export class BingoDiscordService {
  private readonly logger = new Logger(BingoDiscordService.name);
  private flushing = false;

  constructor(
    private readonly db: DataSource,
    private readonly store: BingoStoreService,
    private readonly renderer: BingoRendererService,
    private readonly client: Client,
  ) {}

  async actor(identity: BingoIdentity): Promise<BingoActor> {
    requireBingo(identity.guildId, 'Use bingo in a Discord server.');
    const channel = await this.channel(identity.guildId, identity.channelId);
    const member = await channel.guild.members.fetch({
      user: identity.user.id,
      force: true,
    });
    const permissions = channel.permissionsFor(member);
    requireBingo(
      permissions?.has(PermissionFlagsBits.ViewChannel),
      'You no longer have access to this channel.',
    );
    return {
      guildId: identity.guildId,
      channelId: identity.channelId,
      userId: identity.user.id,
      manageChannels: permissions.has(PermissionFlagsBits.ManageChannels),
      administrator: member.permissions.has(PermissionFlagsBits.Administrator),
    };
  }

  async member(guildId: string, userId: string): Promise<void> {
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch({ user: userId, force: true });
    requireBingo(!member.user.bot, 'Choose a server member who is not a bot.');
  }

  undoMenu(
    game: BingoGame,
    eligible: number[],
    userId: string,
  ): ActionRowBuilder<StringSelectMenuBuilder> {
    requireBingo(eligible.length, 'There are no marked cells you can unmark.');
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`bingo/undo/${game.id}/${userId}/${game.messageId}`)
        .setPlaceholder('Select a cell to unmark')
        .addOptions(
          eligible.map((i) => ({
            label: bingoLabel(
              `${cellLabel(i, game.size)} — ${game.cells[i].text}`,
            ),
            value: String(i),
          })),
        ),
    );
  }

  /** A cross-process lock orders Discord updates; mutations remain committed if delivery fails. */
  async publish(
    gameId: string,
    restore = false,
    refresh = false,
  ): Promise<string> {
    const runner = this.db.createQueryRunner();
    let locked = false;
    try {
      await runner.connect();
      await runner.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [
        `bingo:publish:${gameId}`,
      ]);
      locked = true;
      const repo = runner.manager.getRepository(BingoGame);
      const game = await repo.findOneByOrFail({ id: gameId });
      const system: BingoActor = {
        guildId: game.guildId,
        channelId: game.channelId,
        userId: 'system',
        manageChannels: false,
        administrator: false,
      };
      await this.store.gate(system, runner.manager, true);
      const channel = await this.channel(game.guildId, game.channelId);
      const me = await channel.guild.members.fetchMe({ force: true });
      requireBingo(
        channel
          .permissionsFor(me)
          ?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
          ]),
        'The bot needs View Channel, Send Messages, Attach Files, and Read Message History in this channel.',
      );
      let message: Message<true> | null = null;
      if (game.messageId) {
        try {
          message = await channel.messages.fetch({
            message: game.messageId,
            force: true,
          });
        } catch (error) {
          if (!this.unknownMessage(error) || !restore) throw error;
        }
      }
      if (!message || refresh || game.syncedRevision < game.revision) {
        const image = await this.renderer.render(game);
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`bingo/mark/${game.id}`)
          .setPlaceholder(
            game.endedAt ? 'This game has ended' : 'Select a cell to mark',
          )
          .setDisabled(!!game.endedAt)
          .addOptions(
            game.cells.map((cell, i) => ({
              label: bingoLabel(`${cellLabel(i, game.size)} — ${cell.text}`),
              description: cell.markedBy ? 'Already marked' : 'Not marked',
              value: String(i),
            })),
          );
        const components = [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`bingo/unmark/${game.id}`)
              .setLabel('Unmark a cell')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(
                !!game.endedAt || !game.cells.some((c) => c.markedBy),
              ),
          ),
        ];
        const payload: MessageEditOptions = {
          content: `**${escapeMarkdown(game.setName)} · ${game.size}×${game.size}**${game.endedAt ? ' · Game ended' : ''}`,
          files: [
            new AttachmentBuilder(image, {
              name: `bingo-${game.revision}.png`,
            }),
          ],
          attachments: [],
          components,
          allowedMentions: { parse: [] },
        };
        if (message) await message.edit(payload);
        else
          message = await channel.send({
            content: payload.content!,
            files: payload.files,
            components,
            allowedMentions: { parse: [] },
            nonce: `b${createHash('sha256')
              .update(`${game.id}:${game.messageId ?? 'initial'}`)
              .digest('hex')
              .slice(0, 24)}`,
            enforceNonce: true,
          });
        await repo.update(
          { id: game.id },
          { messageId: message.id, syncedRevision: game.revision },
        );
      }
      if (game.bingoAt && !game.announcedAt) {
        const marker = `https://discord.com/channels/${game.guildId}/${game.channelId}/${message.id}`;
        // Recover the send/commit crash window using an immutable, bot-authored marker.
        const alreadySent = await this.findAnnouncement(
          channel,
          game,
          marker,
          me.id,
        );
        if (!alreadySent)
          await channel.send({
            content: `**BINGO!** The first row, column, or main diagonal has been completed.\nhttps://discord.com/channels/${game.guildId}/${game.channelId}/${message.id}`,
            allowedMentions: { parse: [] },
            nonce: `a${game.id.replaceAll('-', '').slice(0, 24)}`,
            enforceNonce: true,
          });
        await repo.update({ id: game.id }, { announcedAt: new Date() });
        this.logger.log(
          `${alreadySent ? 'Recovered first bingo announcement' : 'First bingo announced'} guild=${game.guildId} channel=${game.channelId} game=${game.id}`,
        );
      }
      return `https://discord.com/channels/${game.guildId}/${game.channelId}/${message.id}`;
    } catch (error) {
      this.logFailure('publish', { gameId }, error);
      throw new BingoError(
        'Progress is saved, but the board could not be updated. Check the bot permissions or use /bingo game show to restore a deleted board.',
      );
    } finally {
      try {
        if (locked)
          await runner.query(
            'SELECT pg_advisory_unlock(hashtextextended($1, 0))',
            [`bingo:publish:${gameId}`],
          );
      } catch (error) {
        this.logFailure('publish-unlock', { gameId }, error);
      } finally {
        try {
          if (!runner.isReleased) await runner.release();
        } catch (error) {
          this.logFailure('publish-release', { gameId }, error);
        }
      }
    }
  }

  @Cron('*/30 * * * * *')
  async retryPending(): Promise<void> {
    if (this.flushing || !this.client.isReady()) return;
    this.flushing = true;
    try {
      const games = await this.db
        .getRepository(BingoGame)
        .createQueryBuilder('g')
        .innerJoin(
          'discord_guilds',
          'd',
          "d.id = g.guild_id AND 'bingo' = ANY(d.features)",
        )
        .innerJoin(
          'discord_channels',
          'c',
          "c.id = g.channel_id AND c.discord_guild_id = g.guild_id AND c.features->>'bingo' = 'true'",
        )
        .where(
          'g.synced_revision < g.revision OR (g.bingo_at IS NOT NULL AND g.announced_at IS NULL)',
        )
        .orderBy('g.created_at', 'DESC')
        .limit(25)
        .getMany();
      for (const game of games) {
        try {
          await this.publish(game.id);
        } catch {
          /* publish logs delivery failures; leave persisted progress pending. */
        }
      }
    } catch (error) {
      this.logFailure('retry-pending', {}, error);
    } finally {
      this.flushing = false;
    }
  }

  logFailure(
    action: string,
    context: Record<string, string | null>,
    error: unknown,
  ): void {
    const description = `Bingo ${action} failed ${Object.entries(context)
      .map(([key, value]) => `${key}=${value ?? 'none'}`)
      .join(' ')}`;
    if (error instanceof BingoError)
      this.logger.warn(`${description}\n${bingoErrorDetails(error)}`);
    else this.logger.error(description, bingoErrorDetails(error));
  }

  private async findAnnouncement(
    channel: GuildTextBasedChannel,
    game: BingoGame,
    marker: string,
    botId: string,
  ): Promise<boolean> {
    let before: string | undefined;
    const since = game.bingoAt!.getTime() - 60_000;
    for (;;) {
      const messages = await channel.messages.fetch({ limit: 100, before });
      if (
        messages.some(
          (message) =>
            message.author.id === botId &&
            message.content.startsWith('**BINGO!**') &&
            (message.content.includes(marker) ||
              message.content.includes(`Bingo announcement: \`${game.id}\``) ||
              (!!game.messageId &&
                message.content.includes(
                  `https://discord.com/channels/${game.guildId}/${game.channelId}/${game.messageId}`,
                ))),
        )
      )
        return true;
      const oldest = messages.last();
      if (!oldest || oldest.createdTimestamp < since || messages.size < 100)
        return false;
      before = oldest.id;
    }
  }

  private async channel(
    guildId: string,
    channelId: string,
  ): Promise<GuildTextBasedChannel> {
    const channel = await this.client.channels.fetch(channelId, {
      force: true,
    });
    requireBingo(
      channel &&
        'guildId' in channel &&
        channel.guildId === guildId &&
        channel.isTextBased() &&
        channel.isSendable() &&
        !channel.isThread(),
      'Use bingo in a text or announcement channel on this server.',
    );
    return channel;
  }

  private unknownMessage(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 10008
    );
  }
}
