import { Injectable, Logger } from '@nestjs/common';
import { Client, MessageFlags, PermissionFlagsBits } from 'discord.js';
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { QuoteActor } from './quote-store.service';
import { QuoteError, requireQuote } from './quote-rules';
import { quoteReply } from './quote-renderer';
import { EmbedBuilderService } from '@Services/discord/embed-builder.service';

export type QuoteInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction;

@Injectable()
export class QuoteDiscordService {
  private readonly logger = new Logger(QuoteDiscordService.name);
  constructor(
    private readonly client: Client,
    private readonly embeds: EmbedBuilderService,
  ) {}

  async actor(
    identity: Pick<QuoteInteraction, 'guildId' | 'channelId' | 'user'>,
  ): Promise<QuoteActor> {
    requireQuote(
      identity.guildId && identity.channelId,
      'Use quotes in a Discord server channel.',
    );
    const channel = await this.client.channels.fetch(identity.channelId, {
      force: true,
    });
    requireQuote(
      channel &&
        'guildId' in channel &&
        channel.guildId === identity.guildId &&
        channel.isTextBased() &&
        channel.isSendable(),
      'This server channel is not available.',
    );
    const member = await channel.guild.members.fetch({
      user: identity.user.id,
      force: true,
    });
    requireQuote(
      channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel),
      'You no longer have access to this channel.',
    );
    return {
      guildId: identity.guildId,
      guildName: channel.guild.name,
      channelId: identity.channelId,
      userId: identity.user.id,
      manageGuild: member.permissions.has(PermissionFlagsBits.ManageGuild),
    };
  }

  async run(
    i: QuoteInteraction,
    action: (actor: QuoteActor) => Promise<InteractionEditReplyOptions | void>,
    mode: 'private' | 'public' | 'update' = 'private',
  ): Promise<void> {
    try {
      if (mode === 'update' && 'deferUpdate' in i) await i.deferUpdate();
      else
        await i.deferReply(
          mode === 'public' ? {} : { flags: MessageFlags.Ephemeral },
        );
      const result = await action(await this.actor(i));
      if (result)
        await i.editReply({ ...result, allowedMentions: { parse: [] } });
    } catch (error) {
      await this.failure(i, error, mode);
    }
  }

  async failure(
    i: QuoteInteraction,
    error: unknown,
    mode = 'private',
  ): Promise<void> {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      /^[A-Za-z0-9_-]{1,50}$/.test(String(error.code))
        ? String(error.code)
        : 'unknown';
    const frames =
      error instanceof Error
        ? error.stack
            ?.split('\n')
            .filter((line) => /^\s+at /.test(line))
            .slice(0, 4)
            .join('\n')
        : '';
    this.logger.warn(
      `quote guild=${i.guildId} channel=${i.channelId} user=${i.user.id} ${name} code=${code}${error instanceof QuoteError ? `: ${error.message}` : ''}\n${frames ?? ''}`,
    );
    const payload = {
      ...quoteReply(
        this.embeds,
        error instanceof QuoteError
          ? error.message
          : 'Quotes could not complete this action. Please try again. The error has been logged.',
        'error',
      ),
    };
    try {
      if (!i.deferred && !i.replied)
        await i.reply({ ...payload, flags: MessageFlags.Ephemeral });
      else if (mode === 'update')
        await i.followUp({ ...payload, flags: MessageFlags.Ephemeral });
      else if (mode === 'public') {
        await i.deleteReply();
        await i.followUp({ ...payload, flags: MessageFlags.Ephemeral });
      } else await i.editReply(payload);
    } catch {
      this.logger.warn('Quote error response could not be delivered.');
    }
  }
}
