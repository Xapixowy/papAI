import { Injectable, UseGuards } from '@nestjs/common';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { RequiresDiscordGuildFeature } from '@Decorators/nest/requires-discord-guild-feature.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import {
  WowAddObserverOption,
  WowRemoveObserverOption,
} from '@Options/wow.options';
import { WowCommandsService } from '@Services/wow/wow-commands.service';
import { WowInteractionService } from '@Services/wow/wow-interaction.service';
import {
  replyWowFlow,
  wowFlowContext,
} from '@Controllers/discord/wow/wow-interaction-replies';
import {
  replyWow,
  WowCommand,
} from '@Controllers/discord/wow-commands.controller';

@Injectable()
@WowCommand({ name: 'observer', description: 'Character observations' })
@UseGuards(DiscordGuildFeatureGuard)
@RequiresDiscordGuildFeature(DiscordFeature.WOW_FOREVER)
export class WowObserverCommandsController {
  constructor(
    private readonly commands: WowCommandsService,
    private readonly flows: WowInteractionService,
  ) {}

  @Subcommand({
    name: 'add',
    description: 'Observe a character on an allowed channel',
  })
  async add(
    @Context() [i]: SlashCommandContext,
    @Options() o: WowAddObserverOption,
  ): Promise<void> {
    await replyWowFlow(this.flows, i, () =>
      this.flows.startObservation(wowFlowContext(i), o.character),
    );
  }

  @Subcommand({
    name: 'list',
    description: 'List your observations on this server',
  })
  async list(@Context() [i]: SlashCommandContext): Promise<void> {
    await replyWow(this.commands, i, () =>
      this.commands.list(i.guildId!, i.user.id),
    );
  }

  @Subcommand({
    name: 'remove',
    description:
      'Remove your observation, or any on this server as a bot admin',
  })
  async remove(
    @Context() [i]: SlashCommandContext,
    @Options() o: WowRemoveObserverOption,
  ): Promise<void> {
    await replyWow(this.commands, i, () =>
      this.commands.remove(i.guildId!, i.user.id, o.id),
    );
  }
}
