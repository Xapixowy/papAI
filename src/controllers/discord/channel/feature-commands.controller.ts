import { CHANNEL_COMMANDS_CONFIG } from '@Constants/discord/channel-commands.constant';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { ChannelFeatureValueOption } from '@Options/channel/channel-feature-value.option';
import { FeatureCommandsService } from '@Services/discord/channel/feature-commands.service';
import {
  CommandConfigCommand,
  CommandConfigGroup,
} from '@Types/discord/command-config.type';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import {
  ComponentParam,
  Context,
  Options,
  SelectedStrings,
  type SlashCommandContext,
  StringSelect,
  type StringSelectContext,
  Subcommand,
} from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { ChannelCommandDecorator } from '../channel-commands.controller';

const FEATURE_COMMANDS_CONFIG = CHANNEL_COMMANDS_CONFIG.commands
  .feature as CommandConfigGroup<CommandConfigCommand>;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChannelCommandDecorator({
  name: FEATURE_COMMANDS_CONFIG.name,
  description: FEATURE_COMMANDS_CONFIG.description,
})
export class FeatureCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [];
  }

  constructor(private readonly featureCommandsService: FeatureCommandsService) {
    super();
  }

  @Subcommand(FEATURE_COMMANDS_CONFIG.commands.set)
  @RequiresDiscordUserRole(...FEATURE_COMMANDS_CONFIG.commands.set.userRoles)
  public async onSetCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { feature, value }: ChannelFeatureValueOption,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const { embed, component } = await this.featureCommandsService.setHandler({
      guildId,
      feature,
      value,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
      components: component && [component],
    });
  }

  @StringSelect(`${DiscordSelectId.CHANNELS_TO_SET_FEATURE}/:feature/:value`)
  @RequiresDiscordUserRole(...FEATURE_COMMANDS_CONFIG.commands.set.userRoles)
  async onSetSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [channelId]: string[],
    @ComponentParam('feature') feature: DiscordChannelFeature,
    @ComponentParam('value') value: string,
  ): Promise<void> {
    const embed = await this.featureCommandsService.setSelectHandler({
      feature,
      value: value === 'true',
      channelId,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
