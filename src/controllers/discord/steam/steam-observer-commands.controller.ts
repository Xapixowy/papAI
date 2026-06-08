import { RequiresDiscordGuildFeature } from '@Decorators/requires-discord-guild-feature.decorator';
import { DiscordButtonId } from '@Enums/discord/discord-button-id.enum';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { SteamIdOption } from '@Options/steam-id.option';
import { SteamObserverUpdateOption } from '@Options/steam-observer-update.option';
import { SteamObserverCommandsService } from '@Services/discord/steam/steam-observer-commands.service';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import {
  Button,
  type ButtonContext,
  Context,
  Options,
  SelectedStrings,
  type SlashCommandContext,
  StringSelect,
  type StringSelectContext,
  Subcommand,
} from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { SteamCommandDecorator } from '../steam-commands.controller';
import { STEAM_COMMANDS_CONFIG } from '@Constants/discord/steam-commands.constant';

const OBSERVER_GROUP = STEAM_COMMANDS_CONFIG.commands.observer;

@Injectable()
@UseGuards(DiscordGuildFeatureGuard)
@RequiresDiscordGuildFeature(DiscordFeature.STEAM)
@SteamCommandDecorator({
  name: OBSERVER_GROUP.name,
  description: OBSERVER_GROUP.description,
})
export class SteamObserverCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  constructor(
    private readonly steamObserverCommandsService: SteamObserverCommandsService,
  ) {
    super();
  }

  @Subcommand(OBSERVER_GROUP.commands.add)
  public async onAddCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { steamId }: SteamIdOption,
  ): Promise<void> {
    const guildId = interaction.guildId;
    const discordUserId = interaction.user.id;

    if (!guildId) return;

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const { embed, button } =
      await this.steamObserverCommandsService.addHandler({
        steamInput: steamId,
        discordUserId,
        guildId,
      });

    await interaction.editReply({
      embeds: [embed],
      components: button ? [button] : [],
    });
  }

  @Button(DiscordButtonId.STEAM_OBSERVER_ADD_CONFIRM)
  public async onAddConfirmButton(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    const guildId = interaction.guildId;
    const discordUserId = interaction.user.id;

    if (!guildId) return;

    const { embed, component } =
      await this.steamObserverCommandsService.addButtonHandler({
        discordUserId,
        guildId,
      });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
      components: component ? [component] : [],
    });
  }

  @StringSelect(DiscordSelectId.STEAM_OBSERVER_CHANNEL)
  public async onChannelSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [channelId]: string[],
  ): Promise<void> {
    const guildId = interaction.guildId;
    const discordUserId = interaction.user.id;

    if (!guildId || !channelId) return;

    const embed = await this.steamObserverCommandsService.addSelectHandler({
      discordUserId,
      guildId,
      channelId,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(OBSERVER_GROUP.commands.list)
  public async onListCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guildId = interaction.guildId;
    const discordUserId = interaction.user.id;

    if (!guildId) return;

    const embed = await this.steamObserverCommandsService.listHandler({
      discordUserId,
      guildId,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(OBSERVER_GROUP.commands.remove)
  public async onRemoveCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guildId = interaction.guildId;
    const discordUserId = interaction.user.id;

    if (!guildId) return;

    const { embed, component } =
      await this.steamObserverCommandsService.removeHandler({
        discordUserId,
        guildId,
      });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
      components: component ? [component] : [],
    });
  }

  @StringSelect(DiscordSelectId.STEAM_OBSERVER_REMOVE)
  public async onRemoveSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [observerId]: string[],
  ): Promise<void> {
    const guildId = interaction.guildId;
    const discordUserId = interaction.user.id;

    if (!guildId || !observerId) return;

    const embed = await this.steamObserverCommandsService.removeSelectHandler({
      observerId,
      discordUserId,
      guildId,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(OBSERVER_GROUP.commands.update)
  public async onUpdateCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { enrich }: SteamObserverUpdateOption,
  ): Promise<void> {
    const guildId = interaction.guildId;
    const discordUserId = interaction.user.id;

    if (!guildId) return;

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embed = await this.steamObserverCommandsService.updateHandler({
      discordUserId,
      guildId,
      enrich: enrich ?? false,
    });

    await interaction.editReply({ embeds: [embed] });
  }
}
