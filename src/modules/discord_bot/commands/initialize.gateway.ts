import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordUsersService } from '@Services/discord-users.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import { Context, SlashCommand, type SlashCommandContext } from 'necord';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { BaseCommand } from './base-command';

@Injectable()
export class InitializeGateway extends BaseCommand {
  constructor(
    private readonly discordUsersService: DiscordUsersService,
    private readonly discordSettingsService: DiscordSettingsService,
  ) {
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
    const superAdminUsers = await this.discordUsersService.findAllByRoles([
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
          message: `Bot is now initialized. The user who executes this command will become the SuperAdmin.`,
          title: InitializeGateway.embedTitle,
          interaction,
        }),
      ],
    });
  }

  @SlashCommand({
    name: 'test',
    description: 'Test',
  })
  public async onTestCommand(@Context() [interaction]: SlashCommandContext) {
    const settings = {
      string: await this.discordSettingsService.getValueByKey('test1'),
      number: await this.discordSettingsService.getValueByKey('test2'),
      boolean: await this.discordSettingsService.getValueByKey('test3'),
      array: await this.discordSettingsService.getValueByKey('test4'),
      json: await this.discordSettingsService.getValueByKey('test5'),
    };

    for (const [key, value] of Object.entries(settings)) {
      if (value.isErr()) continue;
      console.log(key, value.value);
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      content: 'Test',
    });
  }
}
