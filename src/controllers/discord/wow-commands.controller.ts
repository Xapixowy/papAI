import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  createCommandGroupDecorator,
  Options,
  type SlashCommandContext,
  Subcommand,
} from 'necord';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { RequiresDiscordGuildFeature } from '@Decorators/nest/requires-discord-guild-feature.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { EphemeralOption } from '@Options/ephemeral.option';
import { WowCharacterOption } from '@Options/wow.options';
import { WowCommandsService } from '@Services/wow/wow-commands.service';

export const WowCommand = createCommandGroupDecorator({
  name: 'wow',
  description: 'WoW: Forever Europe',
});

export async function replyWow(
  commands: WowCommandsService,
  interaction: ChatInputCommandInteraction,
  action: () => Promise<EmbedBuilder[]>,
  ephemeral = true,
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'Użyj tego polecenia na serwerze Discorda.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });
  const embeds = await commands.execute(action);
  const batches: EmbedBuilder[][] = [[]];
  let length = 0;
  for (const embed of embeds) {
    const data = embed.toJSON();
    const size =
      (data.title?.length ?? 0) +
      (data.description?.length ?? 0) +
      (data.footer?.text.length ?? 0) +
      (data.author?.name.length ?? 0) +
      (data.fields ?? []).reduce(
        (n, f) => n + f.name.length + f.value.length,
        0,
      );
    if (length + size > 6000 || batches.at(-1)!.length >= 10) {
      batches.push([]);
      length = 0;
    }
    batches.at(-1)!.push(embed);
    length += size;
  }
  await interaction.editReply({
    embeds: batches[0],
    allowedMentions: { parse: [] },
  });
  for (const batch of batches.slice(1))
    await interaction.followUp({
      embeds: batch,
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      allowedMentions: { parse: [] },
    });
}

@Injectable()
@WowCommand()
@UseGuards(DiscordGuildFeatureGuard)
@RequiresDiscordGuildFeature(DiscordFeature.WOW_FOREVER)
export class WowCommandsController {
  constructor(private readonly commands: WowCommandsService) {}

  @Subcommand({
    name: 'status',
    description: 'Check EU realms and player reports about login problems',
  })
  async status(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: EphemeralOption,
  ): Promise<void> {
    await replyWow(
      this.commands,
      interaction,
      () => this.commands.status(interaction.guildId!),
      options.ephemeral ?? true,
    );
  }

  @Subcommand({
    name: 'character',
    description: 'Show a character profile from the Forever EU Armory',
  })
  async character(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: WowCharacterOption,
  ): Promise<void> {
    await replyWow(
      this.commands,
      interaction,
      () => this.commands.character(options.character),
      options.ephemeral ?? true,
    );
  }
}
