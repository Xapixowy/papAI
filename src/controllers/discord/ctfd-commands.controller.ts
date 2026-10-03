import { CTFD_COMMANDS_CONFIG } from '@Constants/discord/ctfd-commands.constant';
import { RequiresDiscordUserRole } from '@Decorators/nest/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { ChannelOption } from '@Options/channel.option';
import { CtfdCommandsService } from '@Services/discord/ctfd-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  Options,
  type SlashCommandContext,
  Subcommand,
} from 'necord';
import { BaseCommandsController } from './base-commands.controller';

export const CtfdCommandDecorator = createCommandGroupDecorator({
  name: CTFD_COMMANDS_CONFIG.name,
  description: CTFD_COMMANDS_CONFIG.description,
});

const SET_CHANNEL_CONFIG = CTFD_COMMANDS_CONFIG.commands.set_channel;
const CHECK_PLACE_CONFIG = CTFD_COMMANDS_CONFIG.commands.check_place;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@CtfdCommandDecorator()
export class CtfdCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [];
  }

  constructor(private readonly ctfdCommandsService: CtfdCommandsService) {
    super();
  }

  @Subcommand(SET_CHANNEL_CONFIG)
  @RequiresDiscordUserRole(...SET_CHANNEL_CONFIG.userRoles)
  public async onSetChannelCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: ChannelOption,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const { id: channelId } = channel;

    const embeds = await this.ctfdCommandsService.setChannelHandler({
      guildId,
      channelId,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds,
    });
  }

  @Subcommand(CHECK_PLACE_CONFIG)
  public async onCheckPlaceCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const embeds = await this.ctfdCommandsService.checkPlaceHandler();

    await interaction.reply({
      embeds,
    });
  }
}
