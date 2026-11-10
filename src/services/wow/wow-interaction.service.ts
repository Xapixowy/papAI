import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { z } from 'zod';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { ProviderToken } from '@Enums/provider-token.enum';
import { DiscordButtonId } from '@Enums/discord/discord-button-id.enum';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { WowSourceError } from '@Types/wow/wow.type';
import { WowCommandsService } from '@Services/wow/wow-commands.service';
import { WowSourceService } from '@Services/wow/wow-source.service';
import { WowEmbedService } from '@Services/wow/wow-embed.service';

export interface WowFlowContext {
  guildId: string;
  channelId: string;
  userId: string;
}

export interface WowFlowReply {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}

const sessionSchema = z.object({
  guildId: z.string(),
  channelId: z.string(),
  userId: z.string(),
  kind: z.enum(['observe', 'lookup']),
  stage: z.enum(['confirm', 'channel', 'character']),
  characterSlug: z.string().optional(),
});
type Session = z.infer<typeof sessionSchema>;
const SESSION_TTL = 10 * 60;
const PAGE_SIZE = 25;

@Injectable()
export class WowInteractionService {
  constructor(
    private readonly commands: WowCommandsService,
    private readonly source: WowSourceService,
    private readonly embeds: WowEmbedService,
    @Inject(ProviderToken.REDIS) private readonly redis: Redis,
  ) {}

  async execute(action: () => Promise<WowFlowReply>): Promise<WowFlowReply> {
    let components: WowFlowReply['components'] = [];
    const embeds = await this.commands.execute(async () => {
      const reply = await action();
      components = reply.components;
      return reply.embeds;
    });
    return { embeds, components };
  }

  async authorize(token: string, context: WowFlowContext): Promise<void> {
    await this.session(token, context);
  }

  async startObservation(
    context: WowFlowContext,
    input: string,
  ): Promise<WowFlowReply> {
    const character = await this.source.character(input);
    const token = randomUUID();
    await this.save(token, {
      ...context,
      kind: 'observe',
      stage: 'confirm',
      characterSlug: character.slug,
    });
    return {
      embeds: [
        ...this.embeds.message('Is this the character you want to observe?'),
        ...this.embeds.character(character),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`${DiscordButtonId.WOW_OBSERVER_CONFIRM}/${token}`)
            .setLabel('Confirm character')
            .setStyle(ButtonStyle.Success),
          this.cancelButton(token),
        ),
      ],
    };
  }

  async confirm(token: string, context: WowFlowContext): Promise<WowFlowReply> {
    const session = await this.session(token, context);
    this.requireStage(session, 'observe', 'confirm');
    const options = await this.commands.allowedObservationChannels(
      context.guildId,
      context.userId,
    );
    if (!options.length)
      throw new WowSourceError(
        'No available channels have character observations enabled. Ask a bot administrator to configure /wow config character-channel.',
      );
    const next: Session = { ...session, stage: 'channel' };
    const advanced = await this.redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); return 1 end; return 0",
      1,
      `wow:flow:${token}`,
      JSON.stringify(session),
      JSON.stringify(next),
      SESSION_TTL,
    );
    if (advanced !== 1)
      throw new WowSourceError(
        'This request has expired. Run the command again.',
      );
    return this.menu(token, next, options, 0);
  }

  async chooseChannel(
    token: string,
    context: WowFlowContext,
    channelId: string,
  ): Promise<WowFlowReply> {
    const session = await this.session(token, context);
    this.requireStage(session, 'observe', 'channel');
    if (!session.characterSlug)
      throw new WowSourceError(
        'This request has expired. Run /wow observer add again.',
      );
    await this.consume(token);
    // add() rechecks both channel permissions and the database feature flag,
    // including inside the transaction, rather than trusting a stale menu.
    const embeds = await this.commands.add(
      context.guildId,
      context.userId,
      channelId,
      session.characterSlug,
    );
    return { embeds, components: [] };
  }

  async lookup(
    context: WowFlowContext,
    input?: string | null,
  ): Promise<WowFlowReply> {
    if (input)
      return { embeds: await this.commands.character(input), components: [] };
    const options = await this.commands.observedCharacters(
      context.guildId,
      context.channelId,
    );
    if (!options.length)
      throw new WowSourceError(
        'No characters are observed in this channel. Enter a character name or add an observation with /wow observer add.',
      );
    const token = randomUUID();
    const session: Session = { ...context, kind: 'lookup', stage: 'character' };
    await this.save(token, session);
    return this.menu(token, session, options, 0);
  }

  async chooseCharacter(
    token: string,
    context: WowFlowContext,
    slug: string,
  ): Promise<WowFlowReply> {
    const session = await this.session(token, context);
    this.requireStage(session, 'lookup', 'character');
    await this.consume(token);
    const embeds = await this.commands.observedCharacter(
      context.guildId,
      context.channelId,
      slug,
    );
    return { embeds, components: [] };
  }

  async page(
    token: string,
    context: WowFlowContext,
    page: string,
  ): Promise<WowFlowReply> {
    const session = await this.session(token, context);
    if (!/^\d{1,6}$/.test(page) || session.stage === 'confirm')
      throw new WowSourceError(
        'This selection is no longer available. Run the command again.',
      );
    const options =
      session.stage === 'channel'
        ? await this.commands.allowedObservationChannels(
            context.guildId,
            context.userId,
          )
        : await this.commands.observedCharacters(
            context.guildId,
            context.channelId,
          );
    if (!options.length)
      throw new WowSourceError(
        'No options are currently available. Run the command again.',
      );
    return this.menu(token, session, options, Number(page));
  }

  async cancel(token: string, context: WowFlowContext): Promise<WowFlowReply> {
    const session = await this.session(token, context);
    await this.consume(token);
    return {
      embeds: this.embeds.message(
        session.kind === 'observe'
          ? 'Observation cancelled.'
          : 'Character selection cancelled.',
      ),
      components: [],
    };
  }

  private menu(
    token: string,
    session: Session,
    options: { value: string; label: string }[],
    requestedPage: number,
  ): WowFlowReply {
    const lastPage = Math.ceil(options.length / PAGE_SIZE) - 1;
    const page = Math.min(requestedPage, lastPage);
    const channels = session.stage === 'channel';
    const select = new StringSelectMenuBuilder()
      .setCustomId(
        `${channels ? DiscordSelectId.WOW_OBSERVER_CHANNEL : DiscordSelectId.WOW_CHARACTER}/${token}`,
      )
      .setPlaceholder(
        channels
          ? 'Select a notification channel'
          : 'Select an observed character',
      )
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        options
          .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
          .map((o) => ({ label: o.label.slice(0, 100), value: o.value })),
      );
    const buttons = new ActionRowBuilder<ButtonBuilder>();
    if (lastPage > 0)
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`${DiscordButtonId.WOW_FLOW_PAGE}/${token}/${page - 1}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId(`${DiscordButtonId.WOW_FLOW_PAGE}/${token}/${page + 1}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === lastPage),
      );
    buttons.addComponents(this.cancelButton(token));
    return {
      embeds: this.embeds.message(
        `${channels ? 'Select an enabled channel for this observation.' : 'Select a character observed in this channel.'}${lastPage > 0 ? ` Page ${page + 1} of ${lastPage + 1}.` : ''}`,
      ),
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
        buttons,
      ],
    };
  }

  private cancelButton(token: string): ButtonBuilder {
    return new ButtonBuilder()
      .setCustomId(`${DiscordButtonId.WOW_FLOW_CANCEL}/${token}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);
  }

  private async session(
    token: string,
    context: WowFlowContext,
  ): Promise<Session> {
    const raw = /^[a-f0-9-]{36}$/.test(token)
      ? await this.redis.get(`wow:flow:${token}`)
      : null;
    if (!raw)
      throw new WowSourceError(
        'This request has expired. Run the command again.',
      );
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      throw new WowSourceError(
        'This request has expired. Run the command again.',
      );
    const session = parsed.data;
    if (
      session.guildId !== context.guildId ||
      session.channelId !== context.channelId ||
      session.userId !== context.userId
    )
      throw new WowSourceError(
        'This menu belongs to another user or channel. Run the command to open your own.',
      );
    return session;
  }

  private requireStage(
    session: Session,
    kind: Session['kind'],
    stage: Session['stage'],
  ): void {
    if (session.kind !== kind || session.stage !== stage)
      throw new WowSourceError(
        'This step is no longer available. Run the command again.',
      );
  }

  private async save(token: string, session: Session): Promise<void> {
    await this.redis.set(
      `wow:flow:${token}`,
      JSON.stringify(sessionSchema.parse(session)),
      'EX',
      SESSION_TTL,
    );
  }

  private async consume(token: string): Promise<void> {
    if (!(await this.redis.getdel(`wow:flow:${token}`)))
      throw new WowSourceError(
        'This request has expired. Run the command again.',
      );
  }
}
