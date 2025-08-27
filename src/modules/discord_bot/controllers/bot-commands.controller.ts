import { Injectable, UseGuards } from '@nestjs/common';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  type SlashCommandContext,
  Subcommand,
} from 'necord';
import { BOT_COMMANDS_CONFIG } from '../configs/bot-commands.config';
import { RequiresDiscordUserRole } from '../decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { BotCommandsService } from '../services/bot-commands.service';
import { BaseCommandsController } from './base-commands.controller';

const BotCommandDecorator = createCommandGroupDecorator({
  name: BOT_COMMANDS_CONFIG.name,
  description: BOT_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@BotCommandDecorator()
export class BotCommandsController extends BaseCommandsController {
  constructor(private readonly botCommandsService: BotCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand({
    name: BOT_COMMANDS_CONFIG.commands.initialize.name,
    description: BOT_COMMANDS_CONFIG.commands.initialize.description,
  })
  @RequiresDiscordUserRole(...BOT_COMMANDS_CONFIG.commands.initialize.userRoles)
  public async onInitializeCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const { id: userId, username } = interaction.user;

    const embed = await this.botCommandsService.initializeCommandHandler({
      userId,
      username,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
