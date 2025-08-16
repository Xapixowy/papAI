import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { DiscordUserService } from '@Services/discord-user.service';
import { GatewayIntentBits } from 'discord.js';
import { Context, SlashCommand, type SlashCommandContext } from 'necord';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { BaseCommand } from './base-command';

@Injectable()
export class InitializeGateway extends BaseCommand {
  constructor(private readonly discordUserService: DiscordUserService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  static get embedTitle(): string {
    return 'Bot initialization';
  }

  @SlashCommand({
    name: 'initialize',
    description:
      'Initialize the bot (the user who executes this command will become the SuperAdmin)',
  })
  public async onInitializeCommand(
    @Context() [interaction]: SlashCommandContext,
  ) {
    const superAdminUsers = await this.discordUserService.findAllByRoles([
      DiscordUserRole.SUPER_ADMIN,
    ]);

    if (superAdminUsers.isOk()) {
      return interaction.reply({
        ephemeral: true,
        embeds: [
          EmbedBuilderService.simpleError({
            message: 'Bot is already initialized.',
            title: InitializeGateway.embedTitle,
            interaction,
          }),
        ],
      });
    }

    const newSuperAdminUser = await this.discordUserService.create({
      userId: interaction.user.id,
      username: interaction.user.username,
      roles: [DiscordUserRole.SUPER_ADMIN],
    });

    if (
      newSuperAdminUser.isErr() &&
      newSuperAdminUser.error === ErrorCode.DISCORD_USER_EXISTS
    ) {
      const newSuperAdminUserDto = new DiscordUserDto({
        userId: interaction.user.id,
        username: interaction.user.username,
        roles: [DiscordUserRole.SUPER_ADMIN],
      });

      await this.discordUserService.update(newSuperAdminUserDto);
    }

    return interaction.reply({
      ephemeral: true,
      embeds: [
        EmbedBuilderService.simpleSuccess({
          message: `Bot is now initialized. The user who executes this command will become the SuperAdmin.`,
          title: InitializeGateway.embedTitle,
          interaction,
        }),
      ],
    });
  }
}
