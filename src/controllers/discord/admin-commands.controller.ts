import { ADMIN_COMMANDS_CONFIG } from '@Constants/discord/admin-commands.constant';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { AdminCronCommandsService } from '@Services/discord/admin/admin-cron-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  type SlashCommandContext,
  Subcommand,
} from 'necord';
import { BaseCommandsController } from './base-commands.controller';

export const AdminCommandDecorator = createCommandGroupDecorator({
  name: ADMIN_COMMANDS_CONFIG.name,
  description: ADMIN_COMMANDS_CONFIG.description,
});

const CRON_GROUP = ADMIN_COMMANDS_CONFIG.commands.cron;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@AdminCommandDecorator({
  name: CRON_GROUP.name,
  description: CRON_GROUP.description,
})
export class AdminCronCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [];
  }

  constructor(
    private readonly adminCronCommandsService: AdminCronCommandsService,
  ) {
    super();
  }

  @Subcommand(CRON_GROUP.commands.list)
  @RequiresDiscordUserRole(...CRON_GROUP.commands.list.userRoles)
  public async onListCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const embed = this.adminCronCommandsService.listHandler();

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
