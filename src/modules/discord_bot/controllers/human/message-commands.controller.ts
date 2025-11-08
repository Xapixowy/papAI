import { HUMAN_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/human-commands.config';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { MessageIdOption } from '@Modules/discord_bot/options/message-id.option';
import { MessageCommandsService } from '@Modules/discord_bot/services/human/message-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { HumanCommandDecorator } from '../human-commands.controller';

const MESSAGE_COMMANDS_CONFIG = HUMAN_COMMANDS_CONFIG.commands.message;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
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
