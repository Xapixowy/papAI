import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable, UseGuards } from '@nestjs/common';
import { DiscordUsersService } from '@Services/discord-users.service';
import {
  Client,
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  SlashCommand,
  Subcommand,
  type SlashCommandContext,
} from 'necord';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
import { RequiresDiscordUserRole } from '../decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { BaseCommandsService } from './base-commands-service';

const BotCommandDecorator = createCommandGroupDecorator({
  name: 'bot',
  description: 'Bot commands',
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@BotCommandDecorator()
export class BotCommandsService extends BaseCommandsService {
  constructor(
    private readonly discordUsersService: DiscordUsersService,
    private readonly client: Client,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  static get embedTitle(): string {
    return 'Bot initialization';
  }

  @Subcommand({
    name: 'initialize',
    description:
      'Initialize the bot (the user who executes this command will become the SuperAdmin)',
  })
  public async onInitializeCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const superAdminUsers = await this.discordUsersService.findAllByRoles([
      DiscordUserRole.SUPER_ADMIN,
    ]);

    if (superAdminUsers.isOk()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            message: 'Bot is already initialized.',
            title: BotCommandsService.embedTitle,
            client: this.client,
          }),
        ],
      });
    }

    const newSuperAdminUser = await this.discordUsersService.create({
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

      await this.discordUsersService.update(newSuperAdminUserDto);
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: BotCommandsService.embedTitle,
          description: `Bot is now initialized. The user who executes this command will become the SuperAdmin.`,
          client: this.client,
        }),
      ],
    });
  }

  @SlashCommand({
    name: 'test',
    description: 'Test',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onTestCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      content: 'Test',
    });
  }
}
