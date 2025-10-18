import { CHATGPT_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/chatgpt-commands.config';
import { RequiresDiscordUserRole } from '@Modules/discord_bot/decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { ChatgptCommandsService } from '@Modules/discord_bot/services/chatgpt-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import { Context, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { ChatgptCommandDecorator } from '../chatgpt-commands.controller';

const CONFIG_COMMANDS_CONFIG = CHATGPT_COMMANDS_CONFIG.commands.config;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChatgptCommandDecorator({
  name: CONFIG_COMMANDS_CONFIG.name,
  description: CONFIG_COMMANDS_CONFIG.description,
})
export class ConfigCommandsController extends BaseCommandsController {
  constructor(private readonly chatgptCommandsService: ChatgptCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand({
    name: CONFIG_COMMANDS_CONFIG.commands.list.name,
    description: CONFIG_COMMANDS_CONFIG.commands.list.description,
  })
  @RequiresDiscordUserRole(...CONFIG_COMMANDS_CONFIG.commands.list.userRoles)
  public async onConfigListCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.chatgptCommandsService.configListHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
