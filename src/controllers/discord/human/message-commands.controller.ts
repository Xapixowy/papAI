import { HUMAN_COMMANDS_CONFIG } from '@Constants/discord/human-commands.constant';
import { RequiresDiscordGuildFeature } from '@Decorators/requires-discord-guild-feature.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { MessageIdOption } from '@Options/message-id.option';
import { MessageCommandsService } from '@Services/discord/human/message-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { HumanCommandDecorator } from '../human-commands.controller';

const MESSAGE_COMMANDS_CONFIG = HUMAN_COMMANDS_CONFIG.commands.message;

@Injectable()
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.HUMAN)
@HumanCommandDecorator({
  name: MESSAGE_COMMANDS_CONFIG.name,
  description: MESSAGE_COMMANDS_CONFIG.description,
})
export class MessageCommandsController extends BaseCommandsController {
  constructor(private readonly messageCommandsService: MessageCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand(MESSAGE_COMMANDS_CONFIG.commands.remove)
  public async onMessageRemoveCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { messageId }: MessageIdOption,
  ): Promise<void> {
    const embed = await this.messageCommandsService.messageRemoveHandler({
      messageId,
      userId: interaction.user.id,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
