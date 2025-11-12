import { CHATGPT_COMMANDS_CONFIG } from '@Constants/discord/chatgpt-commands.constant';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { UserOption } from '@Options/user.option';
import { UserCommandsService } from '@Services/discord/chatgpt/user-commands.service';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { ChatgptCommandDecorator } from '../chatgpt-commands.controller';

const USER_COMMANDS_CONFIG = CHATGPT_COMMANDS_CONFIG.commands.user;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChatgptCommandDecorator({
  name: USER_COMMANDS_CONFIG.name,
  description: USER_COMMANDS_CONFIG.description,
})
export class UserCommandsController extends BaseCommandsController {
  constructor(private readonly userCommandsService: UserCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand(USER_COMMANDS_CONFIG.commands.add)
  @RequiresDiscordUserRole(...USER_COMMANDS_CONFIG.commands.add.userRoles)
  public async onAddCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: UserOption,
  ): Promise<InteractionResponse<boolean>> {
    const { id, username } = user.user;

    const embed = await this.userCommandsService.userAddHandler({
      userId: id,
      username,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(USER_COMMANDS_CONFIG.commands.remove)
  @RequiresDiscordUserRole(...USER_COMMANDS_CONFIG.commands.remove.userRoles)
  public async onRemoveCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: UserOption,
  ): Promise<InteractionResponse<boolean>> {
    const { id, username } = user.user;

    const embed = await this.userCommandsService.userRemoveHandler({
      userId: id,
      username,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
